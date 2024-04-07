import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';

dotenv.config();
export const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.status(401).json({ msg: "No token provided" });
    }
    jwt.verify(token, process.env.ACCESS_KEY, (err, user) => {
        if (err) {
            return res.status(404).json({err:"Access token is invalid"})
        }
        req.user = user.id
        next()
        })

};
