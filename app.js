const express = require("express");
const mongoose = require("mongoose");
const listingModel = require("./models/listing");
const userModel = require("./models/user");
const path = require("path");
const engine = require('ejs-mate');
const app = express();
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


app.engine('ejs', engine);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname , "/public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


let mongooseURL = "mongodb://127.0.0.1:27017/RuralRemedies";

let main = async () => {
    await mongoose.connect(mongooseURL);
};

main().then(() => {
    console.log("Db connected");
}).catch((err) => {
    console.log("mongoose connection failed", err);
});

app.get("/", async (req, res) => {
    const itemdata = await listingModel.find({});
    let login = false;
    if(req.cookies.token) {
       login = true;
    }
    res.render("listing/index", { itemdata, login });
});

app.get("/show/:id", async (req, res) => {
    const listing = await listingModel.findOne({ _id: req.params.id });
    let login = false;
    if(req.cookies.token) {
       login = true;
    }
    res.render("listing/show", {listing , login}); 

});


app.get("/create", isloggedIn , async (req , res)=>{
    let login = false;
    if(req.cookies.token) {
       login = true;
    }
    res.render("listing/create" , {login})
}) 

app.post("/create", isloggedIn , async (req, res) => {
    const user = await userModel.findOne({email : req.user.email})
   
    try {
        const { title, description,recipe,image} = req.body; 
        const data = await listingModel.create({
            userid : user._id,
            title,
            description,
            recipe,
            image,
         });
        user.list.push(data._id);
       await user.save()
       console.log(user);
       res.send("success");
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/signup" , async (req , res)=>{
    let login = false;
    if(req.cookies.token) {
       login = true;
    }
    res.render("listing/signup" , {login});
   
})

app.post("/signup" ,async (req,res)=>{
    let {fullname ,username ,email , coverImage, password} = req.body;
    let user = await userModel.findOne({email});
    if(user) return res.status(500).send("User already register");
    
    bcrypt.genSalt(10,(err,salt) =>{
           bcrypt.hash(password ,salt, async (err,hash)=>{
              let user =  await userModel.create({
                  fullname,
                  username : username.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
                  email,
                  coverImage,
                  password: hash,
    })
    console.log(user);
   let token =  jwt.sign({email : user.email , userid : user._id}, "sarthak")
   res.cookie('token' , token);
       res.redirect("/");
           })  
    })

}) ;

app.get("/login" , async (req , res)=>{
    let login = false;
    if(req.cookies.token) {
       login = true;
    }
    res.render("listing/login" , {login});
})

app.post("/login", async (req, res) => {
    let user = await userModel.findOne({ email: req.body.email });
    if(user == null) {
      res.redirect("/login")
      
    } else {
        bcrypt.compare(req.body.password, user.password, function(err, result) {
            if (result) {
                const token = jwt.sign({ email: user.email, userid: user._id }, "sarthak");
                res.cookie("token", token);
                let data = jwt.verify(token,"sarthak"); 
                res.redirect('/'); 
            } else {
                return res.status(401).send("Invalid credentials");
            }
        });
    } 
});

app.get("/logout" , (req , res)=>{
    res.cookie('token' , "");
    res.redirect("/login");
})

app.get("/list" , isloggedIn , async (req , res)=>{
     let login = true
     const ownerlist = await listingModel.find({userid : req.user.userid})
     const ownerDetail = await userModel.findOne({_id : req.user.userid})
     
     console.log(ownerlist);
     res.render("listing/profile" , {ownerlist, login , ownerDetail})

})

function isloggedIn(req,res,next) {
   
    try {
        if(req.cookies.token === "") return res.redirect("/login");
        else {
       let data = jwt.verify(req.cookies.token,"sarthak"); 
        req.user = data;
        }
        next();  
    } catch (error) {
        res.redirect("/login");
    }
} 


 




app.get("/delete/:id", isloggedIn , async (req ,res)=>{
   const list =  await listingModel.findOneAndDelete({_id : req.params.id});
   let loggeduser = null;
    if(req.cookies.token) {
        try {
            loggeduser = jwt.verify(req.cookies.token, "sarthak");
        } catch (err) {
            console.log("Invalid token");
        }
    }
  res.send(`
   <script>
       alert("Listing Deleted successfully!");
       window.location.href = "/";
   </script>
`);
})

app.get("/edit/:id", isloggedIn , async(req , res)=>{4
    const listing = await listingModel.findOne({ _id: req.params.id });
    let login = false;
    if(req.cookies.token) {
       login = true;
    }
    res.render("listing/edit" , {listing , login}); 
})

app.post("/edit/:id", async (req, res) => {
    try {
        const { title, description, image, price, location, country } = req.body;
        const listing = await listingModel.findOneAndUpdate({_id : req.params.id},
            {
                title,
                description,
                image,
                price,
                location,
                country,
               
            },
          
        );
        if (!listing) {
            return res.status(404).send("Listing not found");
        }
         res.redirect(`/show/${listing._id}`)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log("app is listening at port 8080");
});
