const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const CODE_EXPIRY_MINUTES = 5;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function getExpiryTimestamp() {
  return new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();
}

function isExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

async function findUserByEmail(email) {
  const { data } = await supabase.from('users').select('*').eq('email', email).single();
  return data || null;
}

async function invalidateActiveCodes(table, userId) {
  await supabase
    .from(table)
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null);
}

async function getLatestActiveCode(table, userId) {
  const { data } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data || null;
}

async function getLatestCodeAnyStatus(table, userId) {
  const { data } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data || null;
}

async function register(req, res, next) {
  try {
    const { password, full_name, contact_number, role, clinic_id } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password || !full_name) {
      const err = new Error('email, password, and full_name are required');
      err.statusCode = 400;
      return next(err);
    }

    const finalRole = role || 'parent';
    const allowedRoles = ['parent', 'clinic', 'admin'];

    if (!allowedRoles.includes(finalRole)) {
      const err = new Error('Invalid role');
      err.statusCode = 400;
      return next(err);
    }

    if (finalRole === 'clinic' && !clinic_id) {
      const err = new Error('clinic_id is required for clinic staff accounts');
      err.statusCode = 400;
      return next(err);
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      const err = new Error('Email already registered');
      err.statusCode = 400;
      return next(err);
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([{
        email,
        password_hash,
        role: finalRole,
        clinic_id: finalRole === 'clinic' ? clinic_id : null,
        email_verified: false
      }])
      .select()
      .single();

    if (userError) {
      const err = new Error(userError.message);
      err.statusCode = 500;
      return next(err);
    }

    let profile = null;

    if (finalRole === 'parent') {
      const { data: newParent, error: parentError } = await supabase
        .from('parents')
        .insert([{ user_id: newUser.id, full_name, contact_number }])
        .select()
        .single();

      if (parentError) {
        const err = new Error(parentError.message);
        err.statusCode = 500;
        return next(err);
      }

      profile = newParent;
    }

    const code = generateCode();
    const code_hash = await bcrypt.hash(code, 10);

    const { error: codeError } = await supabase
      .from('email_verification_codes')
      .insert([{ user_id: newUser.id, code_hash, expires_at: getExpiryTimestamp() }]);

    if (codeError) {
      const err = new Error(codeError.message);
      err.statusCode = 500;
      return next(err);
    }

    try {
      await sendVerificationEmail(email, code);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      const err = new Error('Account created, but the verification email could not be sent. Please try resending the code.');
      err.statusCode = 502;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: `${finalRole} account registered successfully. Please check your email for a verification code.`,
      data: { id: newUser.id, email: newUser.email, role: newUser.role, clinic_id: newUser.clinic_id, profile }
    });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { code } = req.body;

    if (!email || !code) {
      const err = new Error('email and code are required');
      err.statusCode = 400;
      return next(err);
    }

    const user = await findUserByEmail(email);

    if (!user) {
      const err = new Error('Invalid or expired code');
      err.statusCode = 400;
      return next(err);
    }

    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified. You can log in.'
      });
    }

    const activeCode = await getLatestActiveCode('email_verification_codes', user.id);

    if (!activeCode || isExpired(activeCode.expires_at)) {
      const err = new Error('Verification code expired or invalid. Please request a new one.');
      err.statusCode = 400;
      return next(err);
    }

    if (activeCode.attempts >= MAX_CODE_ATTEMPTS) {
      const err = new Error('Too many failed attempts. Please request a new code.');
      err.statusCode = 429;
      return next(err);
    }

    const codeMatches = await bcrypt.compare(String(code), activeCode.code_hash);

    if (!codeMatches) {
      await supabase
        .from('email_verification_codes')
        .update({ attempts: activeCode.attempts + 1 })
        .eq('id', activeCode.id);

      const err = new Error('Invalid verification code');
      err.statusCode = 400;
      return next(err);
    }

    await supabase
      .from('email_verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', activeCode.id);

    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', user.id);

    if (updateError) {
      const err = new Error(updateError.message);
      err.statusCode = 500;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (err) {
    next(err);
  }
}

async function resendVerificationCode(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      const err = new Error('email is required');
      err.statusCode = 400;
      return next(err);
    }

    const user = await findUserByEmail(email);

    if (!user) {
      const err = new Error('No pending registration found for this email');
      err.statusCode = 404;
      return next(err);
    }

    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified. You can log in.'
      });
    }

    const lastCode = await getLatestCodeAnyStatus('email_verification_codes', user.id);

    if (lastCode) {
      const secondsSinceLast = (Date.now() - new Date(lastCode.created_at).getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast);
        const err = new Error(`Please wait ${waitSeconds} seconds before requesting another code.`);
        err.statusCode = 429;
        return next(err);
      }
    }

    await invalidateActiveCodes('email_verification_codes', user.id);

    const code = generateCode();
    const code_hash = await bcrypt.hash(code, 10);

    const { error: codeError } = await supabase
      .from('email_verification_codes')
      .insert([{ user_id: user.id, code_hash, expires_at: getExpiryTimestamp() }]);

    if (codeError) {
      const err = new Error(codeError.message);
      err.statusCode = 500;
      return next(err);
    }

    try {
      await sendVerificationEmail(email, code);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      const err = new Error('Could not send verification email. Please try again shortly.');
      err.statusCode = 502;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'A new verification code has been sent to your email.'
    });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const genericMessage = 'If that email is registered, a password reset code has been sent.';

    if (!email) {
      const err = new Error('email is required');
      err.statusCode = 400;
      return next(err);
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const lastCode = await getLatestCodeAnyStatus('password_reset_codes', user.id);

    if (lastCode) {
      const secondsSinceLast = (Date.now() - new Date(lastCode.created_at).getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        return res.status(200).json({ success: true, message: genericMessage });
      }
    }

    await invalidateActiveCodes('password_reset_codes', user.id);

    const code = generateCode();
    const code_hash = await bcrypt.hash(code, 10);

    const { error: codeError } = await supabase
      .from('password_reset_codes')
      .insert([{ user_id: user.id, code_hash, expires_at: getExpiryTimestamp() }]);

    if (codeError) {
      const err = new Error(codeError.message);
      err.statusCode = 500;
      return next(err);
    }

    try {
      await sendPasswordResetEmail(email, code);
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr.message);
      return res.status(200).json({ success: true, message: genericMessage });
    }

    res.status(200).json({ success: true, message: genericMessage });
  } catch (err) {
    next(err);
  }
}

async function verifyResetCode(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { code } = req.body;

    if (!email || !code) {
      const err = new Error('email and code are required');
      err.statusCode = 400;
      return next(err);
    }

    const user = await findUserByEmail(email);

    if (!user) {
      const err = new Error('Invalid or expired code');
      err.statusCode = 400;
      return next(err);
    }

    const activeCode = await getLatestActiveCode('password_reset_codes', user.id);

    if (!activeCode || isExpired(activeCode.expires_at)) {
      const err = new Error('Invalid or expired code');
      err.statusCode = 400;
      return next(err);
    }

    if (activeCode.attempts >= MAX_CODE_ATTEMPTS) {
      const err = new Error('Too many attempts. Please request a new code.');
      err.statusCode = 429;
      return next(err);
    }

    const codeMatches = await bcrypt.compare(String(code), activeCode.code_hash);

    if (!codeMatches) {
      await supabase
        .from('password_reset_codes')
        .update({ attempts: activeCode.attempts + 1 })
        .eq('id', activeCode.id);

      const err = new Error('Invalid code');
      err.statusCode = 400;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Code verified. You can now set a new password.'
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { code, new_password } = req.body;

    if (!email || !code || !new_password) {
      const err = new Error('email, code, and new_password are required');
      err.statusCode = 400;
      return next(err);
    }

    if (new_password.length < 8) {
      const err = new Error('new_password must be at least 8 characters');
      err.statusCode = 400;
      return next(err);
    }

    const user = await findUserByEmail(email);

    if (!user) {
      const err = new Error('Invalid or expired code');
      err.statusCode = 400;
      return next(err);
    }

    const activeCode = await getLatestActiveCode('password_reset_codes', user.id);

    if (!activeCode || isExpired(activeCode.expires_at)) {
      const err = new Error('Invalid or expired code');
      err.statusCode = 400;
      return next(err);
    }

    if (activeCode.attempts >= MAX_CODE_ATTEMPTS) {
      const err = new Error('Too many attempts. Please request a new code.');
      err.statusCode = 429;
      return next(err);
    }

    const codeMatches = await bcrypt.compare(String(code), activeCode.code_hash);

    if (!codeMatches) {
      await supabase
        .from('password_reset_codes')
        .update({ attempts: activeCode.attempts + 1 })
        .eq('id', activeCode.id);

      const err = new Error('Invalid code');
      err.statusCode = 400;
      return next(err);
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', user.id);

    if (updateError) {
      const err = new Error(updateError.message);
      err.statusCode = 500;
      return next(err);
    }

    await supabase
      .from('password_reset_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', activeCode.id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      const err = new Error('email and password are required');
      err.statusCode = 400;
      return next(err);
    }

    const user = await findUserByEmail(email);

    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    if (!user.email_verified) {
      const err = new Error('Please verify your email before logging in.');
      err.statusCode = 403;
      return next(err);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, clinic_id: user.clinic_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { token, user: { id: user.id, email: user.email, role: user.role, clinic_id: user.clinic_id } }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, verifyEmail, resendVerificationCode, forgotPassword, verifyResetCode, resetPassword };