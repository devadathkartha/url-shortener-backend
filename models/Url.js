const mongoose=require('mongoose');

const UrlSchema=new mongoose.Schema({
    longUrl:{
        type:String,
        required:true,
        unique:true,
    },
    shortUrl:{
        type:String,
        required:true,
        unique:true,
    },
    hitCnt:{
        type:Number,
        default:0,
    },
    reqTimes:{
        type:[Date],
        default:[],
    }
});

module.exports = mongoose.model('Url', UrlSchema);