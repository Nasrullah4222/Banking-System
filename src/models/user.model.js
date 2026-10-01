const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
 
const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: [true,"Email is required."],
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
        unique: [true, "Email already exist."]
    },
    name:{
        type: String,
        required: [true,"Name is required to create a account."]
    },
    password:{
        type: String,
        required: [true, "Password is required to create a account."],
        minlength: [6, "Password should contain atleast 6 character."],
        select: false
    },
    systemUser:{
        type: Boolean,
        default: false,
        immutable: true,
        select: false
    }    
}, {
    timestamps: true
})

userSchema.pre("save", async function () {
    if (!this.isModified("password")){
        return 
    }
    const hash = await bcrypt.hash(this.password, 10)

    this.password = hash;

    return
    
})

userSchema.method.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password)
    
}

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;