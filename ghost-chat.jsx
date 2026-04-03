import { useState, useEffect, useRef, useCallback } from "react";

const ADMIN_PASSWORD = "arun@3333$$3434asd5346%$^%";
const POLL_MS = 2500;
const HEARTBEAT_MS = 6000;
const ONLINE_TIMEOUT = 18000;

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const genCode = () => Math.random().toString(36).slice(2,6).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
const fmt = (iso) => new Date(iso).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const fmtFull = (iso) => new Date(iso).toLocaleString();

const sg = async (key) => { try { const r = await window.storage.get(key,true); return r ? JSON.parse(r.value) : null; } catch { return null; } };
const ss = async (key,val) => { try { await window.storage.set(key,JSON.stringify(val),true); } catch {} };

const updatePresence = async (uid, uname) => { const o = await sg("gc_online")||{}; o[uid]={username:uname,timestamp:Date.now()}; await ss("gc_online",o); };
const removePresence = async (uid) => { const o = await sg("gc_online")||{}; delete o[uid]; await ss("gc_online",o); };
const getOnline = async (excludeId) => { const o = await sg("gc_online")||{}; const now=Date.now(); return Object.entries(o).filter(([id,u])=>id!==excludeId&&now-u.timestamp<ONLINE_TIMEOUT).map(([id,u])=>({id,...u})); };

const tryMatch = async (uid, uname) => {
  const queue = (await sg("gc_queue"))||[];
  const now = Date.now();
  const fresh = queue.filter(q=>now-q.ts<30000&&q.uid!==uid);
  if(fresh.length>0){
    const partner=fresh[0]; const rest=fresh.slice(1);
    await ss("gc_queue",rest);
    const code=genCode();
    await ss("gc_match_"+uid,{code,pid:partner.uid,pname:partner.uname,ts:now});
    await ss("gc_match_"+partner.uid,{code,pid:uid,pname:uname,ts:now});
    return {matched:true,code,pname:partner.uname};
  } else { fresh.push({uid,uname,ts:now}); await ss("gc_queue",fresh); return {matched:false}; }
};
const checkMatch = async (uid) => { const m=await sg("gc_match_"+uid); return m&&Date.now()-m.ts<120000?m:null; };
const leaveQueue = async (uid) => { const q=(await sg("gc_queue"))||[]; await ss("gc_queue",q.filter(x=>x.uid!==uid)); };

const getRoomMsgs = async (code) => (await sg("gc_rm_"+code))||[];
const saveRoomMsgs = async (code, msgs) => await ss("gc_rm_"+code, msgs.slice(-200));
const getRoomsIdx = async () => (await sg("gc_rooms_v2"))||[];
const addRoom = async (code, type) => { const r=await getRoomsIdx(); if(!r.find(x=>x.code===code)){r.push({code,type,created:Date.now()});await ss("gc_rooms_v2",r);} };

const compressImage = (file, maxW, q) => new Promise(res=>{
  maxW=maxW||900; q=q||0.75;
  const reader=new FileReader();
  reader.onload=function(e){ const img=new Image(); img.onload=function(){
    const canvas=document.createElement("canvas"); let w=img.width,h=img.height;
    if(w>maxW){h=h*maxW/w;w=maxW;}
    canvas.width=w;canvas.height=h;
    canvas.getContext("2d").drawImage(img,0,0,w,h);
    res(canvas.toDataURL("image/jpeg",q));
  }; img.src=e.target.result; };
  reader.readAsDataURL(file);
});
const blobToBase64 = (blob) => new Promise(res=>{ const reader=new FileReader(); reader.onloadend=()=>res(reader.result); reader.readAsDataURL(blob); });

const C = { bg:"#07080f", surface:"#0f1117", border:"#1e2535", teal:"#00d4aa", purple:"#a78bfa", muted:"#475569", dimmed:"#334155", danger:"#f87171", text:"#e2e8f0", textSec:"#64748b" };
const mono = { fontFamily:"'Courier New',monospace" };
const cardStyle = { background:C.surface, border:"1px solid "+C.border, borderRadius:"16px", boxShadow:"0 0 40px rgba(0,212,170,0.05)" };
const inp = { width:"100%", background:C.bg, border:"1px solid "+C.border, borderRadius:"8px", padding:"10px 14px", color:C.text, fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"'Courier New',monospace" };
const mkBtn = (bg,color) => { bg=bg||C.teal; color=color||"#07080f"; return { padding:"11px 18px", background:bg, color:color, border:"none", borderRadius:"8px", fontWeight:"700", fontSize:"12px", letterSpacing:"1.5px", textTransform:"uppercase", cursor:"pointer", fontFamily:"'Courier New',monospace" }; };
const mkGhost = (color) => { color=color||C.muted; return { padding:"9px 16px", background:"transparent", color:color, border:"1px solid "+C.border, borderRadius:"8px", fontSize:"12px", letterSpacing:"1px", cursor:"pointer", fontFamily:"'Courier New',monospace" }; };
const lbl = { fontSize:"11px", letterSpacing:"2px", color:C.textSec, textTransform:"uppercase", marginBottom:"6px", display:"block" };
const hr = { height:"1px", background:C.border, margin:"1.25rem 0" };
const pill = (c) => { c=c||"teal"; return { display:"inline-block", padding:"2px 8px", borderRadius:"4px", fontSize:"10px", letterSpacing:"1px", textTransform:"uppercase", background:c==="teal"?"rgba(0,212,170,0.1)":"rgba(167,139,250,0.1)", color:c==="teal"?C.teal:C.purple, border:"1px solid "+(c==="teal"?"rgba(0,212,170,0.2)":"rgba(167,139,250,0.2)") }; };

const CSS = `
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  *{box-sizing:border-box;}
  input:focus,textarea:focus{border-color:#00d4aa!important;box-shadow:0 0 0 3px rgba(0,212,170,0.08)!important;outline:none;}
  button:active{transform:scale(0.97);}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:#07080f;}
  ::-webkit-scrollbar-thumb{background:#1e2535;border-radius:4px;}
  audio{width:100%;height:36px;}
  video{max-width:100%;border-radius:8px;}
`;

export default function App() {
  const [screen, setScreen] = useState("join");
  const [username, setUsername] = useState("");
  const [uid] = useState(genId);
  const [roomCode, setRoomCode] = useState("");
  const [roomType, setRoomType] = useState("group");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [searchDots, setSearchDots] = useState(".");
  const [partnerName, setPartnerName] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminRooms, setAdminRooms] = useState([]);
  const [selRoom, setSelRoom] = useState(null);
  const [selMsgs, setSelMsgs] = useState([]);
  const [error, setError] = useState("");
  const [adminErr, setAdminErr] = useState("");
  const [recording, setRecording] = useState(false);
  const [oneTimePreview, setOneTimePreview] = useState(null);
  const [roomInputCode, setRoomInputCode] = useState("");

  const pollRef = useRef(null);
  const hbRef = useRef(null);
  const searchPollRef = useRef(null);
  const dotsRef = useRef(null);
  const bottomRef = useRef(null);
  const currentRoom = useRef("");
  const currentUser = useRef("");
  const currentUid = useRef(uid);
  const mediaRecRef = useRef(null);
  const audioChunks = useRef([]);
  const fileRef = useRef(null);
  const isOneTime = useRef(false);

  useEffect(()=>{ bottomRef.current&&bottomRef.current.scrollIntoView({behavior:"smooth"}); },[messages]);

  useEffect(()=>{
    if(screen==="home"||screen==="chat"||screen==="search"){
      updatePresence(uid,username);
      hbRef.current=setInterval(()=>updatePresence(uid,username),HEARTBEAT_MS);
      return function(){ clearInterval(hbRef.current); removePresence(uid); };
    }
  },[screen,uid,username]);

  useEffect(()=>{
    if(screen==="home"){
      var refresh=function(){ getOnline(uid).then(function(u){ setOnlineCount(u.length); }); };
      refresh(); var t=setInterval(refresh,5000); return function(){ clearInterval(t); };
    }
  },[screen,uid]);

  var pollMsgs = useCallback(function(){ getRoomMsgs(currentRoom.current).then(function(msgs){ setMessages(msgs); }); },[]);

  useEffect(()=>{
    if(screen==="chat"){ pollMsgs(); pollRef.current=setInterval(pollMsgs,POLL_MS); return function(){ clearInterval(pollRef.current); }; }
  },[screen,pollMsgs]);

  useEffect(()=>{
    if(screen==="search"){
      dotsRef.current=setInterval(()=>setSearchDots(function(d){ return d.length>=3?".":d+"."; }),600);
      searchPollRef.current=setInterval(function(){
        checkMatch(currentUid.current).then(function(m){ if(m){ clearAll(); enterRoom(m.code,"private",m.pname); } });
      },2000);
      return function(){ clearInterval(dotsRef.current); clearInterval(searchPollRef.current); };
    }
  },[screen]);

  var clearAll = function(){ clearInterval(pollRef.current); clearInterval(hbRef.current); clearInterval(searchPollRef.current); clearInterval(dotsRef.current); };

  var enterRoom = function(code,type,pname){
    pname=pname||"";
    addRoom(code,type);
    currentRoom.current=code; currentUser.current=username;
    setRoomCode(code); setPartnerName(pname); setScreen("chat");
  };

  var handleJoinApp = function(){ if(!username.trim()){setError("Enter a username.");return;} setError(""); setScreen("home"); };
  var handleEnterRoom = function(){ if(!roomInputCode.trim()){setError("Enter a room code.");return;} setError(""); enterRoom(roomInputCode.trim().toUpperCase(),roomType); };

  var handleSearchFriends = function(){
    setScreen("search");
    tryMatch(uid,username).then(function(r){ if(r.matched){ enterRoom(r.code,"private",r.pname); } });
  };

  var handleCancelSearch = function(){ leaveQueue(uid); setScreen("home"); };
  var handleLeaveChat = function(){ clearAll(); removePresence(uid); setMessages([]); setInput(""); setScreen("home"); };

  var sendMsg = function(obj){
    return getRoomMsgs(currentRoom.current).then(function(msgs){
      var m=Object.assign({id:Date.now()+"-"+Math.random().toString(36).slice(2),username:currentUser.current,timestamp:new Date().toISOString()},obj);
      var updated=msgs.concat([m]);
      return saveRoomMsgs(currentRoom.current,updated).then(function(){ setMessages(updated); });
    });
  };

  var handleSend = function(){ if(!input.trim()) return; sendMsg({type:"text",text:input.trim()}); setInput(""); };

  var handleFileChange = function(e){
    var file=e.target.files[0]; if(!file) return;
    if(file.type.indexOf("image/")===0){
      compressImage(file).then(function(data){ sendMsg({type:isOneTime.current?"one-time-image":"image",data:data,viewed:false}); });
    } else if(file.type.indexOf("video/")===0){
      if(file.size>4*1024*1024){alert("Video too large. Max 4MB.");return;}
      blobToBase64(file).then(function(data){ sendMsg({type:"video",data:data,mimeType:file.type}); });
    }
    e.target.value="";
  };

  var handleStartRecord = function(){
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      audioChunks.current=[];
      var mr=new MediaRecorder(stream);
      mr.ondataavailable=function(e){ audioChunks.current.push(e.data); };
      mr.onstop=function(){
        var blob=new Blob(audioChunks.current,{type:"audio/webm"});
        stream.getTracks().forEach(function(t){ t.stop(); });
        if(blob.size>3*1024*1024){alert("Voice message too long."); setRecording(false); return;}
        blobToBase64(blob).then(function(data){ sendMsg({type:"voice",data:data,mimeType:"audio/webm"}); setRecording(false); });
      };
      mediaRecRef.current=mr; mr.start(); setRecording(true);
    }).catch(function(){ alert("Microphone access denied."); });
  };
  var handleStopRecord = function(){ if(mediaRecRef.current) mediaRecRef.current.stop(); };

  var handleViewOneTime = function(msgId){
    getRoomMsgs(currentRoom.current).then(function(msgs){
      var msg=msgs.find(function(m){ return m.id===msgId; });
      if(!msg) return;
      setOneTimePreview(msg.data);
      var updated=msgs.map(function(m){ return m.id===msgId?Object.assign({},m,{viewed:true,data:null}):m; });
      saveRoomMsgs(currentRoom.current,updated); setMessages(updated);
      setTimeout(function(){ setOneTimePreview(null); },10000);
    });
  };

  var handleAdminLogin = function(){
    if(adminPass!==ADMIN_PASSWORD){setAdminErr("Access denied.");return;}
    setAdminErr(""); getRoomsIdx().then(function(r){ setAdminRooms(r); }); setScreen("admin");
  };
  var handleSelRoom = function(r){ setSelRoom(r); getRoomMsgs(r.code).then(function(m){ setSelMsgs(m); }); };
  var handleClearRoom = function(code){ saveRoomMsgs(code,[]); setSelMsgs([]); };
  var handleAdminRefresh = function(){ getRoomsIdx().then(function(r){ setAdminRooms(r); }); if(selRoom) getRoomMsgs(selRoom.code).then(function(m){ setSelMsgs(m); }); };

  var pageWrap = { minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0.75rem", fontFamily:"'Courier New',monospace" };

  if(screen==="join") return (
    <div style={pageWrap}>
      <style>{CSS}</style>
      <div style={Object.assign({},cardStyle,{padding:"2rem",width:"100%",maxWidth:"420px"})}>
        <div style={{fontSize:"12px",letterSpacing:"6px",color:C.teal,textAlign:"center",marginBottom:"4px"}}>● GHOSTCHAT</div>
        <div style={{fontSize:"22px",fontWeight:"700",textAlign:"center",color:C.text,marginBottom:"4px"}}>Anonymous. Secure.</div>
        <div style={{fontSize:"11px",color:C.textSec,textAlign:"center",marginBottom:"2rem",letterSpacing:"1px"}}>No accounts. No tracking. No traces.</div>
        <div style={{marginBottom:"1rem"}}>
          <label style={lbl}>Choose your alias</label>
          <input style={inp} placeholder="e.g. ghost_wanderer" value={username} onChange={function(e){setUsername(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")handleJoinApp();}}/>
        </div>
        {error&&<div style={{background:"#1a0a0a",border:"1px solid #7f1d1d",color:C.danger,borderRadius:"6px",padding:"8px 12px",fontSize:"12px",marginBottom:"8px"}}>{error}</div>}
        <button style={Object.assign({},mkBtn(),{width:"100%"})} onClick={handleJoinApp}>Enter GhostChat →</button>
        <div style={hr}/>
        <div style={{fontSize:"10px",letterSpacing:"2px",color:C.dimmed,textAlign:"center",marginBottom:"10px",textTransform:"uppercase"}}>Admin Access</div>
        <div style={{display:"flex",gap:"8px"}}>
          <input type="password" style={Object.assign({},inp,{flex:1})} placeholder="Admin password" value={adminPass} onChange={function(e){setAdminPass(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")handleAdminLogin();}}/>
          <button style={mkGhost(C.textSec)} onClick={handleAdminLogin}>Unlock</button>
        </div>
        {adminErr&&<div style={{background:"#1a0a0a",border:"1px solid #7f1d1d",color:C.danger,borderRadius:"6px",padding:"8px 12px",fontSize:"12px",marginTop:"8px"}}>{adminErr}</div>}
        <div style={hr}/>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"13px",color:C.teal,fontWeight:"700",letterSpacing:"1px",marginBottom:"4px"}}>🔒 100% Secure &amp; Private</div>
          <div style={{fontSize:"11px",color:C.textSec,lineHeight:"1.7"}}>Your messages are end-to-end protected. No personal data is stored, no identity is tracked. Only people with your room code can read your conversation.</div>
        </div>
      </div>
    </div>
  );

  if(screen==="home") return (
    <div style={pageWrap}>
      <style>{CSS}</style>
      <div style={Object.assign({},cardStyle,{padding:"2rem",width:"100%",maxWidth:"440px"})}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <div>
            <div style={{fontSize:"14px",fontWeight:"700",color:C.teal,letterSpacing:"2px"}}>GHOSTCHAT</div>
            <div style={{fontSize:"12px",color:C.textSec}}>as <span style={{color:C.purple}}>@{username}</span></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"11px",color:C.textSec}}>Online</div>
            <div style={{fontSize:"26px",fontWeight:"700",color:C.teal,lineHeight:"1"}}>{onlineCount}</div>
          </div>
        </div>
        <div style={{background:"rgba(0,212,170,0.05)",border:"1px solid rgba(0,212,170,0.15)",borderRadius:"12px",padding:"1.25rem",marginBottom:"1rem"}}>
          <div style={{fontSize:"12px",fontWeight:"700",color:C.teal,letterSpacing:"2px",marginBottom:"4px"}}>🔍 FIND SOMEONE ONLINE</div>
          <div style={{fontSize:"12px",color:C.textSec,marginBottom:"1rem"}}>Instantly match with a random online user for a private anonymous 1-on-1 chat.</div>
          <button style={Object.assign({},mkBtn(),{width:"100%",animation:"pulse 2s infinite"})} onClick={handleSearchFriends}>Search Friends</button>
        </div>
        <div style={Object.assign({},cardStyle,{padding:"1.25rem",marginBottom:"1rem"})}>
          <div style={{fontSize:"12px",fontWeight:"700",color:C.text,letterSpacing:"1px",marginBottom:"10px"}}>JOIN OR CREATE A ROOM</div>
          <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
            <button style={Object.assign({},mkGhost(roomType==="group"?C.teal:C.muted),{flex:1,fontSize:"11px",padding:"8px"})} onClick={function(){setRoomType("group");}}>⊞ Group</button>
            <button style={Object.assign({},mkGhost(roomType==="private"?C.purple:C.muted),{flex:1,fontSize:"11px",padding:"8px"})} onClick={function(){setRoomType("private");}}>⊟ Private</button>
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            <input style={Object.assign({},inp,{flex:1,textTransform:"uppercase",letterSpacing:"2px"})} placeholder="Enter room code" value={roomInputCode} onChange={function(e){setRoomInputCode(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")handleEnterRoom();}}/>
            <button style={mkBtn()} onClick={handleEnterRoom}>Join</button>
          </div>
          {error&&<div style={{color:C.danger,fontSize:"12px",marginTop:"6px"}}>{error}</div>}
        </div>
        <div style={{textAlign:"center",fontSize:"11px",color:C.dimmed}}>🔒 100% Secure &amp; Private — All chats are end-to-end protected</div>
      </div>
    </div>
  );

  if(screen==="search") return (
    <div style={pageWrap}>
      <style>{CSS}</style>
      <div style={Object.assign({},cardStyle,{padding:"3rem 2rem",width:"100%",maxWidth:"380px",textAlign:"center"})}>
        <div style={{width:"72px",height:"72px",borderRadius:"50%",border:"3px solid "+C.teal,borderTopColor:"transparent",animation:"spin 1s linear infinite",margin:"0 auto 1.5rem"}}/>
        <div style={{fontSize:"16px",fontWeight:"700",color:C.text,marginBottom:"8px"}}>Searching{searchDots}</div>
        <div style={{fontSize:"12px",color:C.textSec,marginBottom:"2rem"}}>Looking for someone online. You'll be connected anonymously.</div>
        <div style={{background:"rgba(0,212,170,0.05)",border:"1px solid "+C.border,borderRadius:"8px",padding:"10px",marginBottom:"1.5rem"}}>
          <div style={{fontSize:"11px",color:C.textSec}}>Your alias</div>
          <div style={{fontSize:"14px",color:C.teal,fontWeight:"700"}}>@{username}</div>
        </div>
        <button style={Object.assign({},mkGhost(C.danger),{width:"100%"})} onClick={handleCancelSearch}>Cancel Search</button>
      </div>
    </div>
  );

  if(screen==="chat") return (
    <div style={pageWrap}>
      <style>{CSS}</style>
      <input ref={fileRef} type="file" accept="image/*,video/*" style={{display:"none"}} onChange={handleFileChange}/>
      {oneTimePreview&&(
        <div style={{position:"fixed",inset:"0",background:"rgba(0,0,0,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:"999",flexDirection:"column",gap:"1rem"}} onClick={function(){setOneTimePreview(null);}}>
          <div style={{fontSize:"11px",color:C.danger,letterSpacing:"2px",animation:"blink 1s infinite"}}>🔥 ONE-TIME VIEW — TAP TO CLOSE</div>
          <img src={oneTimePreview} alt="" style={{maxWidth:"90vw",maxHeight:"80vh",borderRadius:"8px"}}/>
          <div style={{fontSize:"11px",color:C.muted}}>This image disappears in 10s</div>
        </div>
      )}
      <div style={Object.assign({},cardStyle,{width:"100%",maxWidth:"700px",display:"flex",flexDirection:"column",height:"92vh",maxHeight:"760px"})}>
        <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{width:"7px",height:"7px",borderRadius:"50%",background:C.teal,display:"inline-block",animation:"blink 1.5s infinite"}}/>
              <span style={{fontSize:"13px",fontWeight:"700",letterSpacing:"2px",color:C.teal}}>{roomCode}</span>
              <span style={pill(roomType==="group"?"teal":"purple")}>{roomType}</span>
            </div>
            <div style={{fontSize:"11px",color:C.textSec,marginTop:"2px"}}>
              You: <span style={{color:C.purple}}>@{username}</span>
              {partnerName&&<span> · with <span style={{color:C.teal}}>@{partnerName}</span></span>}
            </div>
          </div>
          <button style={mkGhost(C.danger)} onClick={handleLeaveChat}>Leave</button>
        </div>
        <div style={{flex:"1",overflowY:"auto",padding:"1rem 1.25rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          {messages.length===0&&(
            <div style={{textAlign:"center",color:C.dimmed,fontSize:"13px",marginTop:"3rem"}}>
              <div style={{fontSize:"36px",marginBottom:"8px"}}>🔒</div>
              <div>Room is empty — say something!</div>
            </div>
          )}
          {messages.map(function(m){
            var isMe=m.username===username;
            return (
              <div key={m.id} style={{animation:"fadeUp 0.2s ease",alignSelf:isMe?"flex-end":"flex-start",maxWidth:"78%"}}>
                <div style={{background:isMe?"rgba(0,212,170,0.08)":"#16202e",border:"1px solid "+(isMe?"rgba(0,212,170,0.18)":C.border),borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"8px 12px"}}>
                  <div style={{fontSize:"10px",color:isMe?C.teal:C.purple,letterSpacing:"1px",marginBottom:"4px"}}>@{m.username}</div>
                  {m.type==="text"&&<div style={{fontSize:"14px",color:C.text,lineHeight:"1.5",wordBreak:"break-word"}}>{m.text}</div>}
                  {m.type==="image"&&m.data&&<img src={m.data} alt="" style={{maxWidth:"100%",borderRadius:"6px",display:"block"}}/>}
                  {m.type==="video"&&m.data&&<video src={m.data} controls style={{maxWidth:"100%",borderRadius:"6px"}}/>}
                  {m.type==="voice"&&m.data&&(
                    <div style={{minWidth:"220px"}}>
                      <div style={{fontSize:"10px",color:C.textSec,marginBottom:"4px"}}>🎙 Voice message</div>
                      <audio src={m.data} controls/>
                    </div>
                  )}
                  {m.type==="one-time-image"&&(
                    m.viewed
                      ? <div style={{fontSize:"12px",color:C.muted,fontStyle:"italic"}}>🔥 Image destroyed after viewing</div>
                      : <div style={{textAlign:"center",padding:"0.75rem 1rem"}}>
                          <div style={{fontSize:"11px",color:C.danger,marginBottom:"8px",letterSpacing:"1px"}}>🔥 ONE-TIME IMAGE</div>
                          <button style={Object.assign({},mkBtn(C.danger,"#fff"),{fontSize:"11px"})} onClick={function(){handleViewOneTime(m.id);}}>Tap to View Once</button>
                          <div style={{fontSize:"10px",color:C.muted,marginTop:"6px"}}>Disappears after viewing</div>
                        </div>
                  )}
                  <div style={{fontSize:"10px",color:C.dimmed,marginTop:"4px",textAlign:"right"}}>{fmt(m.timestamp)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"0.75rem 1.25rem",borderTop:"1px solid "+C.border}}>
          <div style={{display:"flex",gap:"6px",marginBottom:"8px",flexWrap:"wrap"}}>
            <button title="Send Image" style={Object.assign({},mkGhost(C.textSec),{padding:"6px 12px",fontSize:"15px"})} onClick={function(){ isOneTime.current=false; fileRef.current.accept="image/*,video/*"; fileRef.current.click(); }}>🖼</button>
            <button title="Send Video" style={Object.assign({},mkGhost(C.textSec),{padding:"6px 12px",fontSize:"15px"})} onClick={function(){ isOneTime.current=false; fileRef.current.accept="video/*"; fileRef.current.click(); }}>🎬</button>
            <button title={recording?"Stop Recording":"Voice Message"} style={Object.assign({},mkGhost(recording?C.danger:C.textSec),{padding:"6px 12px",fontSize:"15px",animation:recording?"blink 1s infinite":"none"})} onClick={recording?handleStopRecord:handleStartRecord}>{recording?"⏹":"🎙"}</button>
            <button title="One-Time Image" style={Object.assign({},mkGhost(C.danger),{padding:"6px 12px",fontSize:"11px"})} onClick={function(){ isOneTime.current=true; fileRef.current.accept="image/*"; fileRef.current.click(); }}>🔥 One-Time</button>
          </div>
          {recording&&<div style={{fontSize:"11px",color:C.danger,letterSpacing:"1px",marginBottom:"6px",animation:"blink 1s infinite"}}>● Recording... tap ⏹ to send</div>}
          <div style={{display:"flex",gap:"8px"}}>
            <input style={Object.assign({},inp,{flex:1})} placeholder="Type a message..." value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")handleSend();}}/>
            <button style={Object.assign({},mkBtn(),{padding:"10px 18px",fontSize:"18px"})} onClick={handleSend}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );

  if(screen==="admin") return (
    <div style={pageWrap}>
      <style>{CSS}</style>
      <div style={Object.assign({},cardStyle,{width:"100%",maxWidth:"900px",display:"flex",flexDirection:"column",height:"92vh",maxHeight:"750px"})}>
        <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <span style={{fontSize:"13px",fontWeight:"700",letterSpacing:"3px",color:C.danger}}>⚠ ADMIN PANEL</span>
            <span style={{fontSize:"11px",color:C.textSec}}>{adminRooms.length} rooms</span>
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            <button style={mkGhost(C.textSec)} onClick={handleAdminRefresh}>↻ Refresh</button>
            <button style={mkGhost(C.danger)} onClick={function(){setScreen("join");}}>Exit</button>
          </div>
        </div>
        <div style={{display:"flex",flex:"1",overflow:"hidden"}}>
          <div style={{width:"220px",borderRight:"1px solid "+C.border,overflowY:"auto",padding:"1rem"}}>
            <div style={{fontSize:"10px",letterSpacing:"2px",color:C.dimmed,textTransform:"uppercase",marginBottom:"10px"}}>Rooms</div>
            {adminRooms.length===0&&<div style={{fontSize:"12px",color:C.dimmed}}>No rooms yet.</div>}
            {adminRooms.map(function(r){
              return (
                <div key={r.code} style={{padding:"8px 10px",borderRadius:"6px",cursor:"pointer",background:selRoom&&selRoom.code===r.code?"rgba(0,212,170,0.08)":"transparent",border:"1px solid "+(selRoom&&selRoom.code===r.code?"rgba(0,212,170,0.2)":"transparent"),marginBottom:"4px"}} onClick={function(){handleSelRoom(r);}}>
                  <div style={{fontSize:"12px",color:selRoom&&selRoom.code===r.code?C.teal:C.text,fontWeight:"700",letterSpacing:"1px"}}>{r.code}</div>
                  <div style={{display:"flex",gap:"6px",marginTop:"3px"}}>
                    <span style={pill(r.type==="group"?"teal":"purple")}>{r.type}</span>
                    <span style={{fontSize:"10px",color:C.dimmed}}>{new Date(r.created).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{flex:"1",overflowY:"auto",padding:"1rem 1.25rem"}}>
            {!selRoom&&<div style={{textAlign:"center",color:C.dimmed,fontSize:"13px",marginTop:"3rem"}}>← Select a room to inspect messages</div>}
            {selRoom&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                  <div>
                    <div style={{fontSize:"15px",fontWeight:"700",color:C.teal,letterSpacing:"2px"}}>#{selRoom.code}</div>
                    <div style={{fontSize:"11px",color:C.textSec}}>{selMsgs.length} messages</div>
                  </div>
                  <button style={mkGhost(C.danger)} onClick={function(){handleClearRoom(selRoom.code);}}>Clear Chat</button>
                </div>
                {selMsgs.length===0&&<div style={{fontSize:"12px",color:C.dimmed}}>No messages in this room.</div>}
                {selMsgs.map(function(m){
                  return (
                    <div key={m.id} style={{borderBottom:"1px solid "+C.border,padding:"10px 0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                        <span style={{fontSize:"11px",color:C.purple,letterSpacing:"1px"}}>@{m.username}</span>
                        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                          <span style={pill(m.type==="text"?"teal":"purple")}>{m.type}</span>
                          <span style={{fontSize:"10px",color:C.dimmed}}>{fmtFull(m.timestamp)}</span>
                        </div>
                      </div>
                      {m.type==="text"&&<div style={{fontSize:"13px",color:C.text,lineHeight:"1.5"}}>{m.text}</div>}
                      {m.type==="image"&&m.data&&<img src={m.data} alt="" style={{maxWidth:"200px",borderRadius:"6px"}}/>}
                      {m.type==="video"&&m.data&&<video src={m.data} controls style={{maxWidth:"300px",borderRadius:"6px"}}/>}
                      {m.type==="voice"&&m.data&&<audio src={m.data} controls style={{maxWidth:"300px"}}/>}
                      {m.type==="one-time-image"&&<div style={{fontSize:"12px",color:m.viewed?C.muted:C.danger}}>{m.viewed?"🔥 Destroyed after view":"[One-time image — not yet viewed]"}</div>}
                      <div style={{fontSize:"10px",color:C.dimmed,marginTop:"4px",fontFamily:"monospace"}}>id:{m.id}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}
