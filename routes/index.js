var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require('../lib/User');
var Villa = require('../lib/Villa');
var Bookin = require('../lib/Bookin');
var validator = require("email-validator");
var moment = require('moment');
var md5 = require('md5');
var multer  = require('multer');
var path = require('path');
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var xlstojson = require("xls-to-json");
var xlsxtojson = require("xlsx-to-json");
let PDFParser = require("pdf2json");
const officeParser = require('officeparser');

mongoose.connect('mongodb://localhost:27017/travel',{ useNewUrlParser: true });

var url = 'mongodb://localhost:27017';
const dbName = 'travel';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index.ejs', { title: 'Travel | HOME' });
});
/* BEGIN REGISTER */
router.get('/register', function(req, res, next) {
  res.render('register.ejs', { title: 'Travel | REGISTER' });
});
router.post('/register', function(req, res) {
  const nom = req.body.nom;
  const prenom = req.body.prenom;
  const email = req.body.email;
  const password = req.body.password;
  const newPassword = req.body.newPassword;
  if (!nom || !prenom || !email || !password || !newPassword) {
    res.render('register.ejs', {
      title: 'Travel | REGISTER',
      msg: 'Tous les champs sont obligatoire !'
    });
  }else
  if(validator.validate(email)=== false){
    res.render('register.ejs', {
      title: 'Travel | REGISTER',
      msg: 'Format email invalid !'
    });
  }else
  if (password.length < 8) {
    res.render('register.ejs', {
      title: 'Travel | REGISTER',
      msg: 'Mot de passe doit être au moins 8 caractères !'
    });
  }else
  if (password !== newPassword) {
    res.render('register.ejs', {
      title: 'Travel | REGISTER',
      msg: 'le mot de passe ne correspond pas !'
    });
  }else{
    var dataArray = [];
    var newuser = new User();
    newuser.nom = nom;
    newuser.prenom = prenom;
    newuser.email = email;
    newuser.password = md5(password);
    newuser.type = 'employer';

    User.find({email:email}, function(err, foundData){
      dataArray.push(foundData);
      console.log(dataArray);
      if(foundData.length > 0){
        res.render('register.ejs', {
          title: 'Travel | REGISTER',
          msg: 'Un compte avec email ' + email + ' existe'
        });
      }else{
        newuser.save(function (err, savedUser) {
          if(err){
            res.render('register.ejs', {
              title: 'Travel | REGISTER',
              msg: err
            });
          }else{
            res.render('register.ejs', {
              title: 'Travel | REGISTER',
              msg: 'Félicitation votre inscription est terminé avec succès !'
            });
          }
        });
      }
    });
  }
});
/* END REGISTER */

/* BEGIN LOGIN */
router.get('/login', function(req, res, next) {
  res.render('login.ejs', { title: 'Travel | LOGIN' });
});
router.post('/login', function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;
  const hash = md5(password);
  if ( !email || !password ) {
    res.render('login.ejs', {
      title: 'Travel | LOGIN',
      msg: 'Tous les champs sont obligatoire !'
    });
  }else
  if(validator.validate(email)=== false){
    res.render('login.ejs', {
      title: 'Travel | LOGIN',
      msg: 'Format email invalid !'
    });
  }else{
    var resultArray = [];
    User.findOne({email:email, password:hash}, function(err, user){
      resultArray.push(user);
      if(!user){
        res.render('login.ejs', {
          title: 'Travel | LOGIN',
          msg: "ce compte n'existe pas"
        });
      }else{
        req.session.user = user;
        req.session._id= user._id;
        req.session.nom = user.nom;
        req.session.prenom = user.prenom;
        req.session.email = user.email;
        if(user.type ==='admin'){
          res.redirect('/admin');
        }else
        if(user.type ==='employer'){
          res.redirect('/employer');
        }else{
          res.redirect('/agence');
        }
      }
    });
  }
});
/* END LOGIN*/

router.get('/admin', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    res.render('admin/admin.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | AdminSpace'
    });
  }

});

router.post('/adminSearch', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    const searchTxt = req.body.searchTxt;
    console.log(searchTxt);
    User.find({type:'employer', $or:[  {'nom':searchTxt}, {'prenom':searchTxt},{'email':searchTxt} ]}, function(err, employer) {
      User.find({type:'Responsable_agence', $or:[ {'nom':searchTxt}, {'prenom':searchTxt},{'email':searchTxt} ]}, function(err, responsable) {
        Villa.find( {$or:[ {'adresse':searchTxt}, {'ville':searchTxt},{'prix':searchTxt},{'dateD':searchTxt}, {'dateF':searchTxt},{'bookin':searchTxt} ]},function(err, villa) {
          res.render('admin/adminSearch.ejs', {
            _id: req.session._id,
            nom: req.session.nom,
            prenom: req.session.prenom,
            email: req.session.email,
            employers : employer,
            responsables : responsable,
            villas : villa,
            title: 'Travel | AdminSpace'
          });
        });
      });
    });

  }

});
/* EXEL FILE */
const storageExel = multer.diskStorage({
  destination: 'public/uploads/sheets/',
  filename: function(req, file, cb){
    cb(null,file.originalname);
  }
});
const uploadExel = multer({
  storage: storageExel,
  fileFilter: function(req, file, cb){
    checkExelFile(file, cb);
  }
}).single('sheetsFiles');
function checkExelFile(file, cb){

  // Check ext
  const extname = path.extname(file.originalname).toLowerCase();
  if(extname ==='.xlsx' || extname ==='.xls' ){
    return cb(null,true);
  } else {
    cb('Error: Exel file Only!');
  }
}
router.post('/invokeExel', function (req, res, next) {
  uploadExel(req, res, (err) => {
    if(err){
      res.render('admin/admin', {
        title: 'Travel | AdminSpace',
        msg: err
      });
    } else {
      if(req.file == undefined){
        res.render('admin/admin', {
          title: 'Travel | AdminSpace',
          msg: 'Error: No File Selected!'
        });
      } else {
        const extname = path.extname(req.file.originalname).toLowerCase();
        if(extname ==='.xlsx'){
          xlsxtojson({
            input: req.file.path,
            output: null
          }, function(err, result) {
            if(err) {
              console.error(err);
            }else {
              const insertDocuments = function(db, callback) {
                // Get the documents collection
                const collection = db.collection('hotel_collection');
                // Insert some documents
                collection.insertMany(result, function(err, rst) {
                  assert.equal(err, null);
                  res.send('File Uploaded! & Data saved in database');
                  callback(rst);
                });
              }
              mongo.connect(url,{ useNewUrlParser: true }, function(err, client) {
                assert.equal(null, err);
                console.log("Connected successfully to server");

                const db = client.db(dbName);

                insertDocuments(db, function() {
                  client.close();
                });
              });
              console.log(result);
            }
          });
        }else
        if(extname ==='.xls'){
          xlstojson({
            input: req.file.path,
            output: null
          }, function(err, result) {
            if(err) {
              console.error(err);
            }else {
              const insertDocuments = function(db, callback) {
                // Get the documents collection
                const collection = db.collection('hotel_collection');
                // Insert some documents
                collection.insertMany(result, function(err, rst) {
                  assert.equal(err, null);
                  res.send('File Uploaded! & Data saved in database');
                  callback(rst);
                });
              }
              mongo.connect(url,{ useNewUrlParser: true }, function(err, client) {
                assert.equal(null, err);
                console.log("Connected successfully to server");

                const db = client.db(dbName);

                insertDocuments(db, function() {
                  client.close();
                });
              });
              console.log(result);
            }
          });
        }
        console.log(req.file.path);
      }
    }
  })
});
/*************************************/

/* PDF FILE */
const storagePdf = multer.diskStorage({
  destination: 'public/uploads/pdf/',
  filename: function(req, file, cb){
    cb(null,file.originalname);
  }
});
const uploadPdf = multer({
  storage: storagePdf,
  fileFilter: function(req, file, cb){
    checkPdfFile(file, cb);
  }
}).single('pdfFiles');
function checkPdfFile(file, cb){
  // Check ext
  const extname = path.extname(file.originalname).toLowerCase();
  if(extname ==='.pdf'  ){
    return cb(null,true);
  } else {
    cb('Error: PDF file Only!');
  }
}
router.post('/invokePdf', function (req, res, next) {
  uploadPdf(req, res, (err) => {
    if(err){
      res.render('admin/admin', {
        title: 'Travel | AdminSpace',
        msg: err
      });
    } else {
      if(req.file == undefined){
        res.render('admin/admin', {
          title: 'Travel | AdminSpace',
          msg: 'Error: No File Selected!'
        });
      } else {
        const extname = path.extname(req.file.originalname).toLowerCase();
        if(extname ==='.pdf'){
          let pdfParser = new PDFParser();
          pdfParser.loadPDF(req.file.path);
          pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
          pdfParser.on("pdfParser_dataReady", pdfData => {
            const insertDocuments = function(db, callback) {
              // Get the documents collection
              const collection = db.collection('hotel_collection');
              // Insert some documents
              collection.insertMany(pdfData, function(err, rst) {
                assert.equal(err, null);
                res.send('File Uploaded! & Data saved in database');
                callback(rst);
              });
            }
            mongo.connect(url,{ useNewUrlParser: true }, function(err, client) {
              assert.equal(null, err);
              console.log("Connected successfully to server");

              const db = client.db(dbName);

              insertDocuments(db, function() {
                client.close();
              });
            });
            console.log(result);
          });
        }
        res.render('admin/admin', {
          title: 'Travel | AdminSpace',
          msg: 'File Uploaded! & Data saved in database'
        });
        console.log(req.file.path);
      }
    }
  })

});
/*******************************************/

/* WORD FILE */
const storageWord = multer.diskStorage({
  destination: 'public/uploads/doc/',
  filename: function(req, file, cb){
    cb(null,file.originalname);
  }
});
const uploadWord = multer({
  storage: storageWord,
  fileFilter: function(req, file, cb){
    checkWordFile(file, cb);
  }
}).single('wordFiles');
function checkWordFile(file, cb){
  // Check ext
  const extname = path.extname(file.originalname).toLowerCase();
  if(extname ==='.docx' ){
    return cb(null,true);
  } else {
    cb('Error: Word file Only!');
  }
}
router.post('/invokeWord', function (req, res, next) {
  uploadWord(req, res, (err) => {
    if(err){
      res.render('admin/admin', {
        title: 'Travel | AdminSpace',
        msg: err
      });
    } else {
      if(req.file == undefined){
        res.render('admin/admin', {
          title: 'Travel | AdminSpace',
          msg: 'Error: No File Selected!'
        });
      } else {
        const extname = path.extname(req.file.originalname).toLowerCase();
        if(extname ==='.docx'){
          officeParser.parseWord(req.file.path, function(data){
            // "data" string in the callback here is the text parsed from the word file passed in the first argument above
            console.log(data);
            const insertDocuments = function(db, callback) {
              // Get the documents collection
              const collection = db.collection('hotel_collection');
              // Insert some documents
              collection.insertMany(data, function(err, rst) {
                assert.equal(err, null);
                res.send('File Uploaded! & Data saved in database');
                callback(rst);
              });
            }
            mongo.connect(url,{ useNewUrlParser: true }, function(err, client) {
              assert.equal(null, err);
              console.log("Connected successfully to server");

              const db = client.db(dbName);

              insertDocuments(db, function() {
                client.close();
              });
            });
          })
        }
      }
    }
  })
});
/*************************************/

router.get('/villa', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    res.render('admin/villa.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | Villa'
    });
  }
});

router.get('/addVilla', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    res.render('admin/addVilla.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | addVilla'
    });
  }
});
router.post('/addVilla', function(req, res, next) {
  const adresse = req.body.adresse;
  const ville = req.body.ville;
  const terrain = req.body.terrain;
  const surface = req.body.surface;
  const chambre = req.body.chambre;
  const salleDeBain = req.body.salleDeBain;
  const toilette = req.body.toilette;
  const prix = req.body.prix;
  const dateD = req.body.dateD;
  const dateF = req.body.dateF;
  const description = req.body.description;

  if (!adresse || !ville || !terrain || !surface || !chambre || !salleDeBain  || !toilette || !prix || !dateD || !dateF || !description) {
    res.render('admin/addVilla.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | addVILLA',
      msg: 'Tous les champs sont obligatoire !'
    });
  }else
  if(ville === '0'){
    res.render('admin/addVilla.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | addVILLA',
      msg: 'Choisir un ville !!!'
    });
  }else
  {
    var newvilla = new Villa();

    newvilla.adresse = adresse;
    newvilla.ville = ville;
    newvilla.terrain = terrain;
    newvilla.surface = surface;
    newvilla.chambre = chambre;
    newvilla.salleDeBain = salleDeBain;
    newvilla.toilette = toilette;
    newvilla.prix = prix;
    newvilla.dateD = dateD;
    newvilla.dateF = dateF;
    newvilla.description = description ;
    newvilla.bookin ='Non';
    newvilla.userId = 'Aucun';
    newvilla.userFullname = 'Aucun';
    newvilla.fullTime = 'Aucun';

    newvilla.save(function (err, savedVilla) {
      if(err){
        res.render('admin/addVilla.ejs', {
          _id: req.session._id,
          nom: req.session.nom,
          prenom: req.session.prenom,
          email: req.session.email,
          title: 'Travel | addVILLA',
          msg: err
        });
      }else{
        res.render('admin/addVilla.ejs', {
          _id: req.session._id,
          nom: req.session.nom,
          prenom: req.session.prenom,
          email: req.session.email,
          title: 'Travel | addVILLA',
          msg: 'Félicitation votre operation est terminé avec succès !'
        });
      }
    });
  }
});

router.get('/gereVilla', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    Villa.find( {},function(err, villas) {
      res.render('admin/gereVilla.ejs', {
        _id: req.session._id,
        nom: req.session.nom,
        prenom: req.session.prenom,
        email: req.session.email,
        items: villas,
        title: 'Travel | gereVilla'
      });
    });
  }
});
router.get('/gereVilla/:id', function(req, res){
  const id = req.params.id;
  console.log(id);
  Villa.findOneAndRemove({_id : id}, function(err){
    if(!err){
      res.redirect('/gereVilla');
    }
  });
});
router.get('/reservationVilla', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    Villa.find({bookin :'Oui'}, function (err, foundData) {
      res.render('admin/reservation_Villa.ejs', {
        _id: req.session._id,
        nom: req.session.nom,
        prenom: req.session.prenom,
        email: req.session.email,
        items:foundData,
        title: 'Travel | reservationVilla'
      });

    })

  }
});

router.get('/updateVilla/:id', function(req, res, next) {
  const id = req.params.id;
  if(!req.session.user){
    res.redirect('/login')
  }else{
    Villa.find( {_id : id},function(err, villas) {
      console.log(villas);
      res.render('admin/updateVilla.ejs', {
        _id: req.session._id,
        nom: req.session.nom,
        prenom: req.session.prenom,
        email: req.session.email,
        items: villas,
        title: 'Travel | updateVilla'
      });
    });
  }
});
router.post('/updateVilla/:id', function(req, res, next) {
  const id = req.params.id;
  const adresse = req.body.adresse;
  const ville = req.body.ville;
  const terrain = req.body.terrain;
  const surface = req.body.surface;
  const chambre = req.body.chambre;
  const salleDeBain = req.body.salleDeBain;
  const toilette = req.body.toilette;
  const prix = req.body.prix;
  const dateD = req.body.dateD;
  const dateF = req.body.dateF;
  const description = req.body.description;

  Villa.findOne({_id:id}, function(err, foundObject){
    if(!err){
      foundObject.adresse = adresse;
      foundObject.ville = ville;
      foundObject.terrain = terrain;
      foundObject.surface = surface;
      foundObject.chambre = chambre;
      foundObject.salleDeBain = salleDeBain;
      foundObject.toilette = toilette;
      foundObject.prix = prix;
      foundObject.dateD = dateD;
      foundObject.dateF = dateF;
      foundObject.description = description ;
      foundObject.save(function(err, updatedObject){
        if(!err){
          res.redirect('/gereVilla');
        }
      });
    }
  });
});

router.get('/deleteVilla/:id', function(req, res){
  const id = req.params.id;
  console.log(id);
  Villa.findOneAndRemove({_id : id}, function(err){
    if(!err){
      res.redirect('/gereVilla');
    }
  });
});

router.get('/employers', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    User.find({type:'employer'}, function(err, users) {
      res.render('admin/employers.ejs', {
        _id: req.session._id,
        nom: req.session.nom,
        prenom: req.session.prenom,
        email: req.session.email,
        items: users,
        title: 'Travel | Employers'
      });
    });
  }

});
router.get('/employers/:id', function(req, res){
  const id = req.params.id;
  console.log(id);
  User.findOneAndRemove({_id : id}, function(err){
    if(!err){
      res.redirect('/employers');
    }
  });
});

router.get('/agences', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    User.find({type:'Responsable_agence'}, function(err, users) {
      res.render('admin/agences.ejs', {
        _id: req.session._id,
        nom: req.session.nom,
        prenom: req.session.prenom,
        email: req.session.email,
        items: users,
        title: 'Travel | Agences'
      });
    });
  }

});
router.get('/agences/:id', function(req, res){
  const id = req.params.id;
  console.log(id);
  User.findOneAndRemove({_id : id}, function(err){
    if(!err){
      res.redirect('/agences');
    }
  });
});

router.get('/addAgences', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    res.render('admin/addAgences.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | addAgences'
    });
  }

});
router.post('/addAgences', function(req, res) {
  const nom = req.body.nom;
  const prenom = req.body.prenom;
  const email = req.body.email;
  const password = req.body.password;
  const newPassword = req.body.newPassword;
  if (!nom || !prenom || !email || !password || !newPassword) {
    res.render('admin/addAgences.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | addAgences',
      msg: 'Tous les champs sont obligatoire !'
    });
  }else
  if(validator.validate(email)=== false){
    res.render('admin/addAgences.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | addAgences',
      msg: 'Format email invalid !'
    });
  }else
  if (password.length < 8) {
    res.render('admin/addAgences.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | addAgences',
      msg: 'Mot de passe doit être au moins 8 caractères !'
    });
  }else
  if (password !== newPassword) {
    res.render('admin/addAgences.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | addAgences',
      msg: 'le mot de passe ne correspond pas !'
    });
  }else{
    var dataArray = [];
    var newuser = new User();
    newuser.nom = nom;
    newuser.prenom = prenom;
    newuser.email = email;
    newuser.password = md5(password);
    newuser.type = 'Responsable_agence';

    User.find({email:email}, function(err, foundData){
      dataArray.push(foundData);
      console.log(dataArray);
      if(foundData.length > 0){
        res.render('admin/addAgences.ejs', {
          _id: req.session._id,
          nom: req.session.nom,
          prenom: req.session.prenom,
          email: req.session.email,
          title: 'Travel | addAgences',
          msg: 'Un compte avec email ' + email + ' existe'
        });
      }else{
        newuser.save(function (err, savedUser) {
          if(err){
            res.render('admin/addAgences.ejs', {
              _id: req.session._id,
              nom: req.session.nom,
              prenom: req.session.prenom,
              email: req.session.email,
              title: 'Travel | addAgences',
              msg: err
            });
          }else{
            res.render('admin/addAgences.ejs', {
              _id: req.session._id,
              nom: req.session.nom,
              prenom: req.session.prenom,
              email: req.session.email,
              title: 'Travel | addAgences',
              msg: 'Félicitation votre inscription est terminé avec succès !'
            });
          }
        });
      }
    });
  }
});

router.get('/profile', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    res.render('admin/profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | Profile'
    });
  }
});
router.post('/profile/:id', function(req, res, next) {
  const id = req.params.id;
  console.log(id);
  const nom = req.body.nom;
  const prenom = req.body.prenom;
  const email = req.body.email;
  const password = req.body.password;
  const newPassword = req.body.newPassword;

  if (!nom || !prenom || !email || !password || !newPassword) {
    res.render('admin/profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | Profile',
      msg: 'Tous les champs sont obligatoire !'
    });
  }else
  if(validator.validate(email)=== false){
    res.render('admin/profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | Profile',
      msg:'Format email invalid !'
    });
  }else
  if (password.length < 8) {
    res.render('admin/profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | Profile',
      msg: 'Mot de passe doit être au moins 8 caractères !'
    });
  }else
  if (password !== newPassword) {
    res.render('admin/profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | Profile',
      msg: 'le mot de passe ne correspond pas !'
    });
  }else{
    User.findOne({_id:id}, function(err, foundObject){
      if(!err){
        foundObject.nom = nom;
        foundObject.prenom = prenom;
        foundObject.email = email;
        foundObject.password = md5(password);
        foundObject.save(function(err, updatedObject){
          if(!err){
            res.render('admin/profile.ejs', {
              _id: req.session._id,
              nom: req.session.nom,
              prenom: req.session.prenom,
              email: req.session.email,
              title: 'Travel | Profile',
              msg: 'Le profil est mis à jour avec succès !'
            });
          }
        });
      }

    });
    res.redirect('/profile');
  }
});

router.get('/employer', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else {
    const findDocuments = function(db, callback) {
      // Get the documents collection
      const collection = db.collection('hotel_collection');
      // Find some documents
      collection.find({}).toArray(function(err, docs) {
        assert.equal(err, null);
        callback(docs);
        console.log(docs);
        res.render('employer/employer_hotel.ejs', {
          _id: req.session._id,
          nom: req.session.nom,
          prenom: req.session.prenom,
          email: req.session.email,
          items: docs,
          title: 'Travel | EmployerSpace'
        });
      });
    }
    mongo.connect(url, function(err, client) {
      assert.equal(null, err);
      console.log("Connected successfully to server");
      const db = client.db(dbName);
      findDocuments(db, function() {
        client.close();
      });
    });

  }
});

router.get('/employerHotel/:id/:userId/:userFullname/:hotel', function(req, res, next) {
  const id = req.params.id;
  const userId = req.params.userId;
  const userFullname = req.params.userFullname;
  const hotel = req.params.hotel;
  const fullTime = moment().format('MMMM Do YYYY, h:mm:ss a');

  var hb = new Bookin();
  hb.userId = userId;
  hb.userFullname = userFullname;
  hb.hotelId = id;
  hb.hotel = hotel;
  hb.fullTime = fullTime;

  Bookin.find({hotelId:id, userId:userId}, function(err, foundData){
    if(foundData.length > 0){
      res.send('<h1>Votre Réservation est deja enregistrer !!!</h1>');
    }else{
      hb.save(function(err, savedData) {
        if(!err){
          res.send('<h1>Votre Réservation est enregistrer !!!</h1>');
        }
      });
    }
  });
});

router.post('/employerSearch', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else{
    const searchTxt = req.body.searchTxt;
    console.log(searchTxt);
    Villa.find( {$or:[ {'adresse':searchTxt}, {'ville':searchTxt},{'prix':searchTxt},{'dateD':searchTxt}, {'dateF':searchTxt} ]},function(err, villa) {
      const findDocuments = function(db, callback) {
        // Get the documents collection
        const collection = db.collection('hotel_collection');
        // Find some documents
        collection.find({$or:[ {'hotel':searchTxt}, {'Date':searchTxt},{'LDP':searchTxt},{'DP':searchTxt}, {'PC':searchTxt},{'All_in':searchTxt}, {'Soft_All_in':searchTxt},{'Sup_single':searchTxt},{'sup_V_mer':searchTxt}, {'enfant_2adult':searchTxt}, {'enfant_1adult':searchTxt},{'Reduction_3_eme_lit':searchTxt},{'Reduction_3eme_lit':searchTxt} ]}).toArray(function(err, docs) {
          assert.equal(err, null);
          callback(docs);
          console.log(docs);
          res.render('employer/employer_search.ejs', {
            _id: req.session._id,
            nom: req.session.nom,
            prenom: req.session.prenom,
            email: req.session.email,
            bookins : docs,
            items : villa,
            title: 'Travel | Search'
          });
        });
      }
      mongo.connect(url, function(err, client) {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        findDocuments(db, function() {
          client.close();
        });
      });
    });
  }
});

router.get('/employerVilla', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else {
    Villa.find({bookin:'Non'},function(err, villa) {
      res.render('employer/employer_villa.ejs', {
        _id: req.session._id,
        nom: req.session.nom,
        prenom: req.session.prenom,
        email: req.session.email,
        items:villa,
        title: 'Travel | EmployerVilla'
      });
    });
  }
});
router.get('/employerVilla/:id/:userId/:userFullname', function(req, res, next) {
  const id = req.params.id;
  const userId = req.params.userId;
  const userFullname = req.params.userFullname;
  const fullTime = moment().format('MMMM Do YYYY, h:mm:ss a');

  Villa.find({_id:id, userId:userId}, function(err, foundData){
    if(foundData.length > 0){
      res.send('<h1>Votre Réservation est deja enregistrer !!!</h1>');
    }else{
      Villa.findOne({_id:id}, function(err, foundObject) {
        foundObject.bookin = 'Oui';
        foundObject.userId = userId;
        foundObject.userFullname = userFullname;
        foundObject.fullTime = fullTime;
        foundObject.save(function (err, updatedObject) {
          if (!err) {
            res.send('<h1>Votre Réservation est enregistrer !!!</h1>');
          }
        });
      });
    }
  });
});

router.get('/cancelVb/:id', function(req, res, next) {
  const id = req.params.id;

  Villa.findOne({_id:id}, function(err, foundObject) {
        foundObject.bookin = 'Non';
        foundObject.userId = 'Aucun';
        foundObject.userFullname = 'Aucun';
        foundObject.fullTime = 'Aucun';
        foundObject.save(function (err, updatedObject) {
          if (!err) {
            res.send('<h1>Votre réservation a été annulée</h1>');
          }
        });
      });
});
router.get('/cancelHb/:id', function(req, res, next) {
  const id = req.params.id;
  Bookin.findOneAndRemove({_id : id}, function(err){
    if(!err){
      res.send('<h1>Votre réservation a été annulée</h1>');
    }
  });
});

router.get('/employerBookin/:id', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else {
    const id = req.params.id;
    Villa.find({userId: id}, function (err, foundData) {
      Bookin.find({userId: id}, function (err, foundObjects) {
        res.render('employer/employer_bookin.ejs', {
          _id: req.session._id,
          nom: req.session.nom,
          prenom: req.session.prenom,
          email: req.session.email,
          items: foundData,
          bookins: foundObjects,
          title: 'Travel | EmployerBookin'
        });
      });
    });
  }
});

router.get('/employerProfile', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else {
    res.render('employer/employer_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | UserProfile'
    });
  }
});
router.post('/employerProfile/:id', function(req, res, next) {
  const id = req.params.id;
  console.log(id);
  const nom = req.body.nom;
  const prenom = req.body.prenom;
  const email = req.body.email;
  const password = req.body.password;
  const newPassword = req.body.newPassword;

  if (!nom || !prenom || !email || !password || !newPassword) {
    res.render('employer/employer_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | EmployerProfile',
      msg: 'Tous les champs sont obligatoire !'
    });
  }else
  if(validator.validate(email)=== false){
    res.render('employer/employer_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | EmployerProfile',
      msg:'Format email invalid !'
    });
  }else
  if (password.length < 8) {
    res.render('employer/employer_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | EmployerProfile',
      msg: 'Mot de passe doit être au moins 8 caractères !'
    });
  }else
  if (password !== newPassword) {
    res.render('employer/employer_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | EmployerProfile',
      msg: 'le mot de passe ne correspond pas !'
    });
  }else{
    User.findOne({_id:id}, function(err, foundObject){
      if(!err){
        foundObject.nom = nom;
        foundObject.prenom = prenom;
        foundObject.email = email;
        foundObject.password = md5(password);
        foundObject.save(function(err, updatedObject){
          if(!err){
            res.render('employer/employer_profile.ejs', {
              _id: req.session._id,
              nom: req.session.nom,
              prenom: req.session.prenom,
              email: req.session.email,
              title: 'Travel | EmployerProfile',
              msg: 'Le profil est mis à jour avec succès !'
            });
          }
        });
      }

    });
    //res.redirect('/userProfile');
  }
});

router.get('/agence', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else {
    Bookin.find( function(err, bookins) {
      res.render('agences/agence.ejs', {
        _id: req.session._id,
        nom: req.session.nom,
        prenom: req.session.prenom,
        email: req.session.email,
        items: bookins,
        title: 'Travel | AgenceSpace'
      });
    });
  }
});

router.get('/agenceProfile', function(req, res, next) {
  if(!req.session.user){
    res.redirect('/login')
  }else {
    res.render('agences/agence_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | AgenceProfile'
    });
  }
});
router.post('/agenceProfile/:id', function(req, res, next) {
  const id = req.params.id;
  console.log(id);
  const nom = req.body.nom;
  const prenom = req.body.prenom;
  const email = req.body.email;
  const password = req.body.password;
  const newPassword = req.body.newPassword;

  if (!nom || !prenom || !email || !password || !newPassword) {
    res.render('agences/agence_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | AgenceProfile',
      msg: 'Tous les champs sont obligatoire !'
    });
  }else
  if(validator.validate(email)=== false){
    res.render('agences/agence_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | AgenceProfile',
      msg:'Format email invalid !'
    });
  }else
  if (password.length < 8) {
    res.render('agences/agence_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | AgenceProfile',
      msg: 'Mot de passe doit être au moins 8 caractères !'
    });
  }else
  if (password !== newPassword) {
    res.render('agences/agence_profile.ejs', {
      _id: req.session._id,
      nom: req.session.nom,
      prenom: req.session.prenom,
      email: req.session.email,
      title: 'Travel | EmployerProfile',
      msg: 'le mot de passe ne correspond pas !'
    });
  }else{
    User.findOne({_id:id}, function(err, foundObject){
      if(!err){
        foundObject.nom = nom;
        foundObject.prenom = prenom;
        foundObject.email = email;
        foundObject.password = md5(password);
        foundObject.save(function(err, updatedObject){
          if(!err){
            res.render('agences/agence_profile.ejs', {
              _id: req.session._id,
              nom: req.session.nom,
              prenom: req.session.prenom,
              email: req.session.email,
              title: 'Travel | AgenceProfile',
              msg: 'Le profil est mis à jour avec succès !'
            });
          }
        });
      }

    });
    //res.redirect('/userProfile');
  }
});

router.get('/logout', function(req, res) {
  req.session.destroy(function () {
    res.redirect('/login');
  });
});
module.exports = router;
