import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mailer from '../../modules/mailer';


import authConfig from '../../config/auth.json';

import User from '../models/User';

const router = express.Router();

function generateToken(params = {}) {
    return jwt.sign(params, authConfig.secret, {
        expiresIn: 86400
    })
}

//--> Register
router.post('/register', async (req, res) => {
    const { email } = req.body;

    try {
        if(await User.findOne({ email }))
            return res.status(400).send({
                error: 'User already exists'
            });

        const user = await User.create(req.body);
        user.password = undefined;

        return res.send({
            user,
            token: generateToken({
                id: user.id
            })
        });
    } catch (err) {
        return res.status(400).send({
            error: 'Registration failed'
        });
    }
});

//--> Authenticate
router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    
    if(!user)
        return res.status(400).send({
            error: 'User not found'
        });    
        
    if(!await bcrypt.compare(password, user.password))
        return res.status(400).send({
            error: 'Invalid password'
        });  
        
    user.password = undefined;

    res.send({ 
        user, 
        token: generateToken({
            id: user.id
        }) 
    });
});

//--> Forgot password
router.post('/forgot_password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user)
            return res.status(400).send({
                error: 'User not found'
            });

        const token = crypto.randomBytes(20).toString('hex');

        const now = new Date();
        now.setHours(now.getHours() + 1);

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now
            }
        }, (err) => {
            if(err)
                res.status(400).send({
                    error: 'Cannot send forgot password email'
                });

            return res.send();
        });

        mailer.sendMail({
            to: email,
            from: 'admin@mail.com',
            template: 'auth/forgot_password',
            context: { token }
        });

    } catch(err) {
        res.status(400).send({
            error: 'Error on forgot password, try again'
        });
    }
});

//--> Reset password
router.post('/reset_password', async (req, res) => {
    const { email, token, password } = req.body;

    try {
        const user = await User.findOne({ email })
            .select('+passwordResetToken passwordResetExpires');

        if(!user)
            return res.status(400).send({
                error: 'User not found'
            });

        if(token !== user.passwordResetToken)
            return res.status(400).send({
                error: 'Token invalid'
            });

        const now = new Date();

        if(now > user.passwordResetExpires)
            return res.status(400).send({
                error: 'Token expired, generate a new one'
            });

        user.password = password;
        await user.save();

        res.send();
    } catch(err) {

    }
});

export default (app) => app.use('/auth', router);
