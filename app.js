const express = require('express');
const connectDB = require('./config/db');
const Url = require('./models/Url');

const app = express();
app.use(express.json());
require('dotenv').config();

connectDB();


//generate id
async function generateShortUrl() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uniq=false;
    let shortUrl = '';
    while(!uniq){
        shortUrl='';
        for (let i = 0; i < 6; i++) {
            shortUrl += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        const sameurl=await Url.findOne({ shortUrl });
        if(!sameurl){
            uniq=true;
        }
    }
    return shortUrl;
}


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


//post to /shorten
app.post('/shorten',async(req,res)=>{
    const {longUrl}=req.body;
    try{
        let existingurl=await Url.findOne({longUrl});
        if(existingurl){
            return res.json({shortUrl:`http://localhost:8080/${existingurl.shortUrl}`});
        }
        const shortUrl=await generateShortUrl();
        const newUrl=new Url({longUrl,shortUrl});
        await newUrl.save();
        res.json({ shortUrl: `http://localhost:8080/${shortUrl}` });
    }
    catch(err){
        res.status(500).json({ message: 'Server Error',error});
    }
});


//redirect

//ratelimit

const ratelimit=async(req,res,next)=>{
    const {shortUrl}=req.params;
    try{
        const urlfound=await Url.findOne({shortUrl});
        if(!urlfound){
            return res.status(404).json({message:'URL not found'});
        }
        const yesterday=new Date(Date.now()-24*60*60*1000);
        const requestlastday=urlfound.reqTimes.filter(date=> date>yesterday);
        if(requestlastday.length>=20){
            return res.status(429).json({message:'Rate limit exceeded'});
        }
        next();
    }
    catch(error){
        res.status(500).json({messgage:'server error'});
    }
}

app.get("/redirect/:shortUrl",ratelimit,async(req,res)=>{
    const {shortUrl}=req.params;
    try{
        const urlfound=await Url.findOne({shortUrl});
        if(!urlfound){
            return res.status(404).json({message:'URL not found'});
        }
        urlfound.hitCnt+=1;
        urlfound.reqTimes.push(new Date());
        await urlfound.save();

        if(urlfound.hitCnt%10 ===0){
            return res.redirect("https://www.google.com");
        }
        return res.redirect("https://"+urlfound.longUrl);
    }
    catch(error){
        res.status(500).json({message:'Server error',error});
    }
});


app.get('/details/:url',async (req,res) => {
    const {url}=req.params;
    try{
      const query=url.length==6?{shortUrl:url}:{longUrl:url};
      const urlRecord = await Url.findOne(query);
      if (!urlRecord) return res.status(404).json({ message: 'URL not found' });
      
      res.json({ 
        longUrl: urlRecord.longUrl, 
        shortUrl: `http://localhost:3000/${urlRecord.shortUrl}`, 
        totalHits: urlRecord.hitCnt
      });
    } 
    catch (error) {
      res.status(500).json({ message: 'Server Error', error });
    }
});

app.get('/top/:number',async(req,res)=>{
    const {number}=req.params;
    try{
        const tophiturls=await Url.find().sort({hitCnt:-1}).limit(Number(number));
        res.json(tophiturls.map(url=>({
            longUrl: url.longUrl, 
            shortUrl: `http://localhost:3000/${url.shortUrl}`, 
            totalHits: url.hitCnt
        })));
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});

