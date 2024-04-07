import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config();

const generateToken = (user) => jwt.sign({ id: user.id }, process.env.ACCESS_KEY, { expiresIn: '1h' });

export default generateToken;