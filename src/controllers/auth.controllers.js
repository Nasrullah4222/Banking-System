const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlacklistModel = require("../models/blacklist.model");

/**
 * @description User register controller. 
 * @POST /api/auth/register
 */
async function userRegisterController(req, res) {
    const {email, password , name} = req.body;

    const isExist = await userModel.findOne({
        email: email
    })

    if(isExist){
        res.status(422).json({
            message: "User exist!",
            status: "Failed"
        })
    }

    const user = await userModel.create({
        email, password, name 
    })
    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRETE, {expiresIn: "3d"});

    res.cookie("token", token)

    res.status(201).json({
        user:{
            _id: user._id,
            name: user.name
        }, 
        token
    })

    /**
     * @I_Will_Fix_This_Later
     */
    //await emailService.sendRegistrationEmail(user.email, user.name);
}

/**
 * @description User login controller. 
 * @POST /api/auth/login
 */
async function userLoginController(req, res) {

    const {email, password} = req.body;

    const user = await userModel.findOne({ email }).select("+password")

    if(!user){
        return res.status(401).json({
            message: "Email or password is invalid."
        })
    }
    const isValidPassword = await user.comparePassword(password);
    if(!isValidPassword){
        return res.status(401).json({
            message: "Email or password is invalid."
        })
    }

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRETE, {expiresIn: "3d"});

    res.cookie("token", token)

    res.status(200).json({
        user:{
            _id: user._id,
            name: user.name
        }, 
        token
    })

    
}

async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }



    await tokenBlacklistModel.create({
        token: token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })

}



module.exports = {userRegisterController, userLoginController, userLogoutController};


