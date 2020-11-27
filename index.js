const express = require('express');
const cors = require('cors')
const app = express();
app.use(cors())
const server = require('http').createServer(app);
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
    console.log(socket.id);
    await setUser(socket.id,socket.handshake.query.userName);
    
    socket.emit("getSomeData",{data: "some random data"});
    io.on('m',(data)=>{console.log(data)});
  });
  //console.log(io.engine)
  setUser =(id,user)=>{    
    newUser = false;
    console.log(id+" ||| "+user+" ||| "+newUser) 
    if(users.length ===0){
      users = [...users,{id:id, user:user, msg:'h1',newMsg:5,imgUrl: '../../assets/f3.jpg',}];
    }
    else{
      if(!newUser){
        users.forEach((dta,index,array) => {
          console.log(dta)
          if(dta.user === user){
              dta.id = id;
              console.log("||| "+newUser);
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
      io.to(socketid.id).emit("new_message",{to: req.query.to, from: req.query.from, msg:req.query.msg,date:req.query.date});
       res.send({
         to: socketid.id,
         from: req.query.from,
         msg:req.query.msg,
       })
      }
    }
    else{
      res.send({error:"wrong params"})
    }
  })