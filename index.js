const express = require('express');
const cors = require('cors')
const app = express();
app.use(cors())
const server = require('http').createServer(app);
var admin = require("firebase-admin");

var serviceAccount = require("./service-account-file.json");
const { Hash } = require('crypto');
const { compileFunction } = require('vm');
const { promises } = require('fs');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://notemakingangular.firebaseio.com"
});
const db = admin.firestore();

const io = require('socket.io')(server,{
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
});
users=[];
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('Server listening at port %d', port);
  });

   io.on('connection',async socket => {
    //console.log(socket.id);
    await setUser(socket.id,socket.handshake.query.userName);
    
  });
  //console.log(io.engine)
  setUser =(id,user)=>{    
    newUser = false;
    //console.log(id+" ||| "+user+" ||| "+newUser) 
    if(users.length ===0){
      users = [...users,{id:id, user:user, msg:'h1',newMsg:5,imgUrl: '../../assets/f3.jpg',}];
    }
    else{
      if(!newUser){
        users.forEach((dta,index,array) => {
          //console.log(dta)
          if(dta.user === user){
              dta.id = id;
              //console.log("||| "+newUser);
              return
          }else newUser = true;
          if(index === array.length -1 && newUser){           
              users = [...users,{id:id, user:user, msg:'h1',newMsg:5,imgUrl: '../../assets/f3.jpg',}];            
          }
      });
      }
    }
  }     
  app.get('/',(req,res)=>{
    res.send('hi')
  })
  app.get('/users',(req,res)=>{
    if(users.length!==0){
      if(req.query.except){
        const newArry = users.reduce((acc,val)=>{
          //console.log(val);
          if(val.user !== req.query.except){
            acc = [...acc,val];
          }
          return acc;
        },[])
        res.send(newArry);
      }
      else{
        res.send(users);
      }
    }
    else{
      res.send(users);
    }
  })
   app.get('/users/socketid/:id', async(req, res)=>{   
    const socketid = await users.find(val=> val.user===req.params.id);
    if(socketid){      
    res.send({id: socketid.id})
    }else{
      res.send(null);
    }
  });
  app.get('/sendprivatemsg',async(req,res)=>{
    if(req.query.msg && req.query.to && req.query.from && req.query.date){
      const socketid = await users.find(val=> val.user===req.query.to);       
      if(!socketid){
        res.send({error:"user not found"});
      }
      else{
     // var socket1 = io.of("/").connected[socketid];
      //console.log(io.sockets.clients())
      const snapshot = await db.collection(req.query.from).doc(req.query.to).get();
   
    if(snapshot.data()){
     // console.log(snapshot.data())
      await db.collection(req.query.from).doc(req.query.to).update({
        messages:[...snapshot.data().messages,  {
          from: req.query.from,
          msg:req.query.msg,
          to: req.query.to,
          date:req.query.date
            }]
      })
    }
    else{
      await db.collection(req.query.from).doc(req.query.to).set({
        messages:[
          {
        from: req.query.from,
        msg:req.query.msg,
        to: req.query.to,
        date:req.query.date
          }
        ]
      })
    }
      io.to(socketid.id).emit("new_message",{to: req.query.to, from: req.query.from, msg:req.query.msg,date:req.query.date});
       res.send({
         from: req.query.from,
         msg:req.query.msg,
         to: req.query.to,
         date:req.query.date
       })
      }
    }
    else{
      res.send({error:"wrong params"})
    }
  });
  app.get('/getusersandoldchats/:id', (req,res)=>{    
    oldmsgg ={};
    if(req.params.id){
      db.collection(req.params.id).get().then(snapshot=>{
        if(snapshot.size > 0){          
        primisses=[];
        // Promise.all(
        //   snapshot.forEach((d)=>{
        //     db.collection(d.id).doc(req.params.id).get().then(
        //       async dt=>{  
        //        oldmsgg[d.id] = [...dt.data().messages,...d.data().messages]    
        //         return oldmsgg     
        //        }          
        //      ) 
        //   })
        // ).then(val=>{
        //   console.log(val)
        // })
          snapshot.forEach( (d)=>{
          primisses.push(
            db.collection(d.id).doc(req.params.id).get().then(
           async dt=>{  
            oldmsgg[d.id] = [...dt.data().messages,...d.data().messages]    
             return oldmsgg     
            }          
          ) 
          )
          }); 
        // console.log(primisses)     
          Promise.all(primisses).then(val=>{
            //console.log(val[0])
            sortedmsg={};
            for (const [key, value] of Object.entries(val[0])) {
             // console.log(`${key}: ${value}`);
              value.sort((a,b)=>{return b.date - a.date})
              sortedmsg[key]=value;
            }
           // console.log(sortedmsg);
            res.send(sortedmsg)
          })                              
        }
        else{
          res.send(null)
        }
      })
    }
    else{
      res.send({error:"wrong path"});
    }
  });