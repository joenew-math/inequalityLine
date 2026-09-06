/*
 * math-dungeon-gameplay：樓層、移動、戰鬥、卡牌、怪物動畫、掉落、結算與主選單控制器。
 * 本檔沿用 classic script 全域依賴，必須在資料模組之後、math-dungeon 相容 runtime 之前載入。
 */

function waypointScreen(p){
  const floorNo=fl+1,key=String(S.zone||0)+':'+floorNo,used=!!(S.waypointRunUses||{})[key];
  overlay(`<div class="kicker">SAFE WAYPOINT</div><h1>🛸 ${floorNo}F 學習傳送點</h1>
    <div class="rank">每 3 層一座・安全結算點</div>
    <div class="desc">${used?'這一輪已在此回傳過成果，不會重複發放獎勵。':'確定後會先保存角色、結算並回傳目前的作業成果，再回到地下城校園地圖。'}<br><br>你可以在地圖重新選擇已開放的區域挑戰。</div>
    <button class="go" id="waypointConfirm">${used?'🗺️ 回到地下城地圖':'✅ 確定結算並傳送'}</button>
    <button class="go" id="waypointCancel" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">繼續探索</button>`,null,el=>{
      if(el.id==='waypointCancel'){running=true;return true;}
      if(el.id==='waypointConfirm'){
        S.zoneProgress=S.zoneProgress||{};S.waypointRunUses=S.waypointRunUses||{};
        const zk=zoneOf().k;S.zoneProgress[zk]=Math.max(Number(S.zoneProgress[zk])||0,fl);
        let packet=null;if(!used){S.waypointRunUses[key]=1;saveChar();packet=classroomCheckpoint('waypoint',{title:zoneOf().n+' '+floorNo+'F 傳送結算',waypointFloor:floorNo});}else saveChar();
        setTimeout(()=>campusScreen(packet?'📨 '+floorNo+'F 學習成果已回傳，可重新選擇區域。':'💾 '+floorNo+'F 進度已保存，可重新選擇區域。'),10);return true;
      }
      return false;
    });
}

function firstDungeonPrologueActive(){
  return (S.zone||0)===0&&fl===0&&!(S.meta&&S.meta.prologueCleared);
}

function prepareFirstDungeonPrologue(){
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  const showcase=['gaussC','pythaC','euclidC','fermatC','pascalC'];
  showcase.forEach(id=>{if(CARDS[id]&&!S.deck.some(o=>o.id===id))S.deck.push({id,gem:null});});
  S.gold=Math.max(999,Number(S.gold)||0);
  S.maxhp=Math.max(180,Number(S.maxhp)||100);S.hp=S.maxhp;
  S.mana=Math.max(20,Number(S.mana)||6);S.armor=Math.max(60,Number(S.armor)||0);
  S.pot=normalizePot(S.pot);['heal','freeze','firebomb','luck','medkit'].forEach(k=>S.pot[k]=Math.max(3,S.pot[k]||0));
  saveChar();
}

const MATH_TEACHER_IMAGE=new Image();
MATH_TEACHER_IMAGE.src='./assets/npcs/math-teacher-v1.png';

function paintPrologueTeacher(id){
  const cv=$(id);if(!cv)return;
  cv.width=128;cv.height=192;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  const draw=()=>{g.clearRect(0,0,128,192);g.drawImage(MATH_TEACHER_IMAGE,0,0,128,192);};
  if(MATH_TEACHER_IMAGE.complete&&MATH_TEACHER_IMAGE.naturalWidth)draw();
  else{
    const fallback=npcArt('guide');g.clearRect(0,0,128,192);g.drawImage(fallback,0,0,fallback.width,fallback.height,20,38,88,116);
    MATH_TEACHER_IMAGE.addEventListener('load',draw,{once:true});
  }
}

function teacherBattleArt(){
  const cv=document.createElement('canvas');cv.width=128;cv.height=192;
  const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  const draw=()=>{g.clearRect(0,0,128,192);g.drawImage(MATH_TEACHER_IMAGE,0,0,128,192);};
  if(MATH_TEACHER_IMAGE.complete&&MATH_TEACHER_IMAGE.naturalWidth)draw();
  else MATH_TEACHER_IMAGE.addEventListener('load',draw,{once:true});
  return cv;
}

function prologueSupplyScreen(){
  running=false;
  overlay(`<div class="kicker">PROLOGUE · 1F</div><h1>🎁 新手補給爆滿！</h1>
    <div class="rank">◉ 999 金幣　❤ 180　◆ 20　護甲 60</div>
    <div class="desc">試作傳說卡、裝備卡與道具全部開放。這一層的怪物也特別弱，先放心體驗連擊、裝備和戰鬥節奏。<br><br>
    <b>提醒：</b>這些是序章借給你的力量；真正能帶進地城深處的，是你練習後留下的理解。</div>
    <button class="go" id="prologueSupplyOk">開始探索教學一樓</button>`,null,el=>{
      if(el.id!=='prologueSupplyOk')return false;
      S.meta.prologueSupplySeen=1;saveChar();running=true;return true;
    });
}

function teacherPrologueEncounter(){
  running=false;
  overlay(`<div class="kicker">STORY ENCOUNTER</div><div class="teacher-alert">！</div>
    <div class="teacher-dialogue"><canvas id="prologueTeacher" class="teacher-pixel"></canvas><div>
      <h1>數學老師擋住了樓梯</h1><p>「先等等。卡牌、裝備和金幣看起來很強，但它們還不是你真正的力量。」</p>
      <p>「想走進真正的地下城，先讓我看看你面對未知題目時，是否願意重新思考。」</p></div></div>
    <button class="go" id="teacherChallenge">📘 開始卡牌試煉</button>`,null,el=>{
      if(el.id!=='teacherChallenge')return false;
      setTimeout(teacherPrologueBattle,20);return true;
    });
  paintPrologueTeacher('prologueTeacher');
}

function teacherPrologueBattle(){
  running=false;
  const teacher={kind:'mathTeacherFinal',art:'mathTeacherFinal',n:'數學老師・課本試煉',uid:'mathTeacherPrologue',
    max:99999,hp:99999,atk:Math.max(28,Math.round(S.maxhp*.38)),burn:0,dead:false,shield:0,
    act:'atk',intent:Math.max(28,Math.round(S.maxhp*.38)),row:0,boss:false,teacherBoss:true,fresh:true,
    expr:'先用卡牌試著迎戰',abilityName:'奧義・課本演算連擊'};
  B={foes:[teacher],draw:freshBattleDraw(),disc:[],hand:[],thr:-1,chain:0,nextMul:1,block:0,best:0,over:false,
    waves:1,target:0,open:'normal',skipEnemy:0,firstTurn:true,pendingLoot:0,lootGold:0,lootXp:0,lootKills:0,
    levelsGained:0,lootAbsorbing:false,lootCollected:false,victoryQueued:false,victoryFinalizing:false,
    delta:1,trait:null,cur:[],bestArr:[],chains:[],ults:{},teacherPrologue:true};
  PARTY.forEach(m=>m.used=false);S.deck.forEach(o=>{delete o._dealt;});
  $('dungeon').classList.add('hide');const bt=$('battle');
  bt.classList.remove('hide','enter','teacher-final-battle');void bt.offsetWidth;bt.classList.add('enter');
  $('veil').classList.add('hide');drawFieldBg();newTurn();
  toast('📘 使用手牌、魔力與連擊迎戰數學老師',3000);
  setTimeout(()=>teacherTextbookAttackFx(teacher,'課本試煉・開卷'),420);
}

const TEACHER_PROLOGUE_LINES=[
  {title:'失敗也是線索',text:'「倒下不代表你不擅長數學，它只是告訴你下一次該從哪裡開始練習。」'},
  {title:'練習會留下力量',text:'「資源會重置，但理解、錯題紀錄與輪迴強化會留下。保持好奇，享受找到答案的過程。」'}
];

function teacherPrologueFallen(index){
  const line=TEACHER_PROLOGUE_LINES[index],last=index===TEACHER_PROLOGUE_LINES.length-1;
  overlay(`<div class="fallen-view step-${index}"><div class="fallen-vignette"></div>
      <canvas id="fallenTeacher" class="fallen-teacher"></canvas><div class="fallen-floor"></div></div>
    <div class="kicker">GROUND VIEW · ${index+1}/${TEACHER_PROLOGUE_LINES.length}</div><h1>${hesc(line.title)}</h1>
    <div class="desc teacher-lesson">${line.text}</div>
    <button class="go" id="teacherLessonNext">${last?'進入真正的地下城':'下一步'}</button>`,null,el=>{
      if(el.id!=='teacherLessonNext')return false;
      setTimeout(()=>last?teacherPrologueConfiscation():teacherPrologueFallen(index+1),20);return true;
    });
  paintPrologueTeacher('fallenTeacher');
}

function teacherPrologueConfiscation(){
  overlay(`<div class="kicker">PROLOGUE RESET</div><h1>📘 老師收回序章補給</h1>
    <div class="confiscation-list"><span>◉ 999 金幣 <b>收回</b></span><span>🛡 借用裝備 <b>收回</b></span><span>🌟 試作傳說卡 <b>收回</b></span><span>🧪 額外道具 <b>收回</b></span></div>
    <div class="desc">「我拿走的是借給你的捷徑，不是你學會的東西。」<br><br>正式冒險只留下<b>${hesc((JOBS[S.job]||{}).n||'目前職業')}的基礎牌組</b>與一份基本藥品。答題紀錄、知識點、寵物圖鑑和已理解的內容仍會保留。</div>
    <button class="go" id="teacherResetConfirm">重新開始真正的冒險</button>`,null,el=>{
      if(el.id!=='teacherResetConfirm')return false;setTimeout(finishTeacherPrologue,20);return true;
    });
}

function finishTeacherPrologue(){
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  S.meta.prologueCleared=1;S.meta.prologueSupplySeen=1;
  markRebirthFloor(1,0);
  const keepZone=0;resetRun();
  const base=(S.job&&JOBS[S.job]&&JOBS[S.job].deck)||['knife','knife','dagger','blank','clock','wand','wand','garlic','whip','imelda'];
  S.deck=mkDeck(base);S.gold=0;S.gems=[];S.tomes=0;S.ups={};S.mana=6;S.handSize=5;S.handCap=5;
  S.pot=normalizePot({heal:1,elixir:0,freeze:0,firebomb:0,luck:0,medkit:0});
  S.zone=keepZone;S.zoneProgress=S.zoneProgress||{};S.zoneProgress[zoneOf().k]=1;
  loadFloor(1);saveChar();backToDungeon();
  toast('序章完成：借用資源已歸還，真正的地下城從 2F 開始',3600);
}

const TEACHER_LEGEND_ORDER=['pascalC','gaussC','euclidC','pythaC','fermatC'];
const TEACHER_ZONE_CLUES=[
  {card:'pascalC',title:'第一線索・從零開始',text:'第一張牌不消耗魔力；新的路徑從 0 展開。'},
  {card:'gaussC',title:'第二線索・依序累積',text:'接著用 1，把分散的數字整理成總和。'},
  {card:'euclidC',title:'第三線索・建立規則',text:'再用 2，從公理與規則建立推理。'},
  {card:'pythaC',title:'第四線索・看見關係',text:'接上 3，用圖形關係連起兩條已知邊。'},
  {card:'fermatC',title:'第五線索・最後證明',text:'最後用 4，完成看似不可能的證明。'},
  {card:null,title:'終極線索・五步解題',text:'真正的順序是 0 → 1 → 2 → 3 → 4；每一步都建立在前一步之上。'}
];

function grantTeacherClue(zoneIndex){
  const clue=TEACHER_ZONE_CLUES[Math.max(0,Math.min(5,zoneIndex))];
  S.meta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  S.meta.teacherClues=Array.isArray(S.meta.teacherClues)?S.meta.teacherClues:[];
  S.meta.legendary=Array.isArray(S.meta.legendary)?S.meta.legendary:[];
  if(!S.meta.teacherClues.includes(zoneIndex))S.meta.teacherClues.push(zoneIndex);
  if(clue.card&&CARDS[clue.card]&&!S.meta.legendary.includes(clue.card))S.meta.legendary.push(clue.card);
  saveChar();return clue;
}

function hiddenTeacherReady(){
  const clues=(S.meta&&S.meta.teacherClues)||[],cards=(S.meta&&S.meta.legendary)||[];
  return TEACHER_ZONE_CLUES.every((_,i)=>clues.includes(i))&&TEACHER_LEGEND_ORDER.every(id=>cards.includes(id));
}

function hiddenTeacherGate(){
  const clues=(S.meta&&S.meta.teacherClues)||[];
  overlay(`<div class="kicker">HIDDEN FLOOR · FINAL</div><div class="teacher-alert">！</div><h1>數學老師在隱藏樓層等你</h1>
    <div class="teacher-clue-grid">${TEACHER_ZONE_CLUES.map((c,i)=>`<div class="${clues.includes(i)?'found':''}"><b>${clues.includes(i)?'✓':'？'} ${hesc(c.title)}</b><span>${clues.includes(i)?hesc(c.text):'尚未取得'}</span></div>`).join('')}</div>
    <div class="desc">「這一次我不會收走你的成果。請把六區找到的線索化成正確的出牌順序，證明你已經能自己思考。」</div>
    <button class="go" id="hiddenTeacherStart">📚 進入最後試煉</button>`,null,el=>{
      if(el.id!=='hiddenTeacherStart')return false;setTimeout(()=>hiddenTeacherBattle(0,100,100),20);return true;
    });
}

function hiddenTeacherBattle(){
  running=false;
  const teacher={kind:'mathTeacherFinal',art:'mathTeacherFinal',n:'數學老師・最終試煉',uid:'mathTeacherFinalBoss',
    max:2400,hp:2400,atk:Math.max(14,Math.round(S.maxhp*.13)),burn:0,dead:false,shield:0,
    act:'atk',intent:Math.max(12,Math.round(S.maxhp*.12)),row:0,boss:false,teacherBoss:true,fresh:true,
    expr:'唯有完成五步推理，才能擊破',abilityName:'奧義・課本演算連擊'};
  const ordinary=freshBattleDraw().filter(o=>!TEACHER_LEGEND_ORDER.includes(o.id));
  const legends=shuffle(TEACHER_LEGEND_ORDER.map(id=>({id,gem:null,_dealt:0})));
  B={foes:[teacher],draw:ordinary.concat(legends),disc:[],hand:[],thr:-1,chain:0,nextMul:1,block:0,best:0,over:false,waves:1,target:0,
    open:'normal',skipEnemy:0,firstTurn:true,pendingLoot:0,lootGold:0,lootXp:0,lootKills:0,levelsGained:0,
    lootAbsorbing:false,lootCollected:false,victoryQueued:false,victoryFinalizing:false,delta:1,trait:null,
    cur:[],bestArr:[],chains:[],ults:{},teacherFinal:true,teacherStep:0,teacherOrder:TEACHER_LEGEND_ORDER.slice()};
  PARTY.forEach(m=>m.used=false);S.deck.forEach(o=>{delete o._dealt;});
  $('dungeon').classList.add('hide');const bt=$('battle');bt.classList.remove('hide','enter');void bt.offsetWidth;bt.classList.add('enter','teacher-final-battle');
  $('veil').classList.add('hide');drawFieldBg();newTurn();
  toast('📘 正常卡牌戰：依費用 0 → 1 → 2 → 3 → 4 施放五張傳說卡',3600);
  setTimeout(()=>teacherTextbookAttackFx(teacher,'最終試煉・開卷'),420);
}

function teacherFinalSequenceOnCard(o){
  if(!B||!B.teacherFinal||B.teacherFinalFinishing||!o)return false;
  const order=B.teacherOrder||TEACHER_LEGEND_ORDER,idx=order.indexOf(o.id);
  if(idx<0)return false; // 一般攻擊、護盾與回魔卡仍可正常使用，不中斷推理。
  const expected=order[B.teacherStep||0];
  if(o.id!==expected){
    B.teacherStep=0;const f=B.foes.find(x=>x.teacherBoss&&!x.dead);
    teacherTextbookAttackFx(f,'順序中斷・課本反擊');
    toast('順序中斷：傳說卡必須依 0 → 1 → 2 → 3 → 4，進度歸零。',2600);return false;
  }
  B.teacherStep=(B.teacherStep||0)+1;
  toast('推理連鎖 '+B.teacherStep+'/5：'+CARDS[o.id].n,1600);
  if(B.teacherStep<order.length)return false;
  const f=B.foes.find(x=>x.teacherBoss&&!x.dead);if(!f)return false;
  B.teacherFinalFinishing=true;B.busy=true;teacherStudentFullPowerFx(f);
  setTimeout(()=>{
    if(!B||B.over||!f)return;
    f.hp=0;f.dead=true;popDmg(f,99999,true,'全力一擊 ');renderAll();queueBattleVictory();
  },1550);
  return true;
}

function hiddenTeacherRetry(){
  overlay(`<div class="kicker">TRY AGAIN</div><h1>推理順序中斷了</h1><div class="desc">老師沒有拿走你的卡牌，也不會把這次記成死亡。<br>「看一次線索、說出每一步的理由，再重新排列。」</div>
    <button class="go" id="hiddenTeacherRetry">重新挑戰</button><button class="go muted" id="hiddenTeacherLeave">先回營地整理</button>`,null,el=>{
      if(el.id==='hiddenTeacherRetry'){setTimeout(()=>hiddenTeacherBattle(0,100,100),20);return true;}
      if(el.id==='hiddenTeacherLeave'){nameEntry(true);return true;}return false;
    });
}

function hiddenTeacherVictory(){
  const simulation=typeof TEACHER_FINAL_SIMULATION!=='undefined'&&TEACHER_FINAL_SIMULATION;
  if(!simulation){S.meta=S.meta||{};S.meta.hiddenEnding=1;S.meta.teacherDefeatedAt=Date.now();saveChar();}
  overlay(`<div class="kicker">TRUE ENDING</div><h1>✨ 最後隱藏結局・真正的數學冒險者</h1>
    <div class="teacher-dialogue"><canvas id="endingTeacher" class="teacher-pixel"></canvas><div><p>「你沒有靠序章借來的力量，而是靠線索、練習與正確順序走到這裡。」</p><p>「真正的通關不是再也不會答錯，而是你已經懂得在錯誤後重新推理，也開始享受找出規律。」</p></div></div>
    <div class="rank">🏆 隱藏稱號「真心享受數學的人」${simulation?'（模擬模式不寫入紀錄）':'已記錄'}</div><button class="go" id="hiddenEndingDone">${simulation?'返回地下城首頁':'完成六冊冒險'}</button>`,null,el=>{
      if(el.id!=='hiddenEndingDone')return false;simulation?campusScreen('隱藏戰模擬完成，正式紀錄沒有變更。'):nameEntry(true);return true;
    });paintPrologueTeacher('endingTeacher');
}

function loadFloor(i){
  const Z=zoneOf();
  fl=i;
  const prologue=firstDungeonPrologueActive();
  if(prologue)prepareFirstDungeonPrologue();
  applyTheme(S.zone||0,i);   // 區域主題會隨樓層升高切換到雲海／空中花園
  const isLast=(i>=Z.floors-1);
  const rooms=Z.rooms&&Z.rooms.length?Z.rooms:null;
  const actName=(Z.acts||[])[Math.min(3,Math.floor(i/3))]||'';
  const F={n:Z.n+' '+(i+1)+'F'+(actName?'・'+actName:'')+(rooms?'　'+rooms[i%rooms.length]:''), vol:Z.vol};
  setMazeSize(S.zone||0,i);        // 地圖隨難度（區域深度＋樓層）擴大
  const M=genMaze();
  grid=M.grid; MW=MSZ; MH=MSZ; const cells=M.cells;
  // 起點：隨機挑一格
  const start=cells[rand(cells.length)];
  // 內容配置：鑰匙與樓梯要離起點夠遠，彼此也分開
  // 房間角落 = 區塊內部但不在十字通道上（局部座標 x,y 皆非 2）
  // NPC、商店、神殿放這裡，才不會擋在主要動線上
  const corners=cells.filter(([x,y])=>{
    const lx=x%TSZ, ly=y%TSZ;
    return lx>=1&&lx<=3&&ly>=1&&ly<=3&&lx!==2&&ly!==2;
  });
  occupied=new Set(); claim(start);          // 每層重置佔用表，起點先佔住
  const spots=pickSpots(cells,[['key',10],['stair',12],['chest1',6],['chest2',6]],start);
  // 第二批（商店／神殿／NPC）沿用同一張佔用表，不會蓋到鑰匙或樓梯
  // 角落池要放得下全部 8 件才用；不足就直接用全地圖，並帶 fallback 保證不缺件
  const side=pickSpots(corners.filter(isFree).length>=10?corners:cells,
    [['shop',4],['shrine',4],['forge',5],['npcA',3],['npcB',3],['npcC',3],
     ['guide',2],['numline',5],['beastshrine',5],['waypoint',5]],start,cells);
  Object.assign(spots,side);
  // 每層保留一位「課程入口」與一位尚未學過的遊戲機制導師。
  // 學科教學一律開啟課程目錄，不另外在地下城維護第二份講義。
  const npcKeys=[];
  const courseKey='course'+Z.vol;
  if(NPCS[courseKey])npcKeys.push(courseKey);
  const zn=Z.npcs.filter(k=>k!==courseKey&&NPCS[k]&&!NPCS[k].coursePortal&&!codexHas(k,false));
  if(zn.length)npcKeys.push(zn[rand(zn.length)]);
  const at=k=>spots[k]||[undefined,undefined];   // 安全取位：就算缺件也不在建構時崩潰
  props=[
    {t:'key',x:at('key')[0],y:at('key')[1],alive:1},
    {t:isLast?'exit':'stair',x:at('stair')[0],y:at('stair')[1],alive:1},
    {t:'chest',x:at('chest1')[0],y:at('chest1')[1],alive:1},
    {t:'chest',x:at('chest2')[0],y:at('chest2')[1],alive:1},
    {t:'shop',x:at('shop')[0],y:at('shop')[1],alive:1},
    {t:'numline',x:at('numline')[0],y:at('numline')[1],alive:1},
    {t:'shrine',x:at('shrine')[0],y:at('shrine')[1],alive:1},
    {t:'forge',x:at('forge')[0],y:at('forge')[1],alive:1},
    {t:'beastshrine',x:at('beastshrine')[0],y:at('beastshrine')[1],alive:1},
    ...((i+1)%3===0?[{t:'waypoint',x:at('waypoint')[0],y:at('waypoint')[1],alive:1}]:[]),
  ].concat(npcKeys[0]&&spots.npcA
    ? [{t:'npc',k:npcKeys[0],x:spots.npcA[0],y:spots.npcA[1],alive:1}] : []
  ).concat(npcKeys[1]&&spots.npcB
    ? [{t:'npc',k:npcKeys[1],x:spots.npcB[0],y:spots.npcB[1],alive:1}] : []
  ).concat(i===0&&!codexHas('guide',false)&&spots.guide
    ? [{t:'npc',k:'guide',x:spots.guide[0],y:spots.guide[1],alive:1}] : []
  ).filter(o=>o.x!==undefined&&o.y!==undefined)   // 最後保險：缺位的道具寧可不擺也不崩潰
   .map(o=>Object.assign(o,{talked:0}));
  /* 12 層制的稀有設施排程：避免每層都出現而失去期待感。
     神殿 3/9F、融合工坊 4/10F、隱藏房入口 6/11F。 */
  const facilityFloors={shrine:[2,8],forge:[3,9],beastshrine:[4,10],numline:[5,10]};
  props=props.filter(p=>!facilityFloors[p.t]||facilityFloors[p.t].includes(i));
  // 每層只有一座升級神殿；本輪已使用過就不再生成。
  const usedShrine=(S.shrineUses||{})[(S.zone||0)+':'+fl];
  if(usedShrine)props.forEach(p=>{if(p.t==='shrine')p.alive=0;});
  // 怪物隊伍：隨機散佈
  // 怪物隊伍依區域；最後一層放 Boss
  const stage=Math.min(3,Math.floor(i/3));
  const floorSpecies=FLOOR_MONSTERS[S.zone||0]||[];
  const floorSquads=floorSpecies.slice(0,Math.min(floorSpecies.length,2+stage*2)).map(o=>'floor_'+o.k);
  const regionalSpecies=(REGION_MONSTERS[S.zone||0]||[]).slice(0,4+stage*2);
  const regionalSquads=regionalSpecies.map(o=>'region_'+o.k);
  const zs=[...Z.squads.slice(0,Math.min(Z.squads.length,2+stage)),...floorSquads,...regionalSquads];
  // 大地圖等比補怪，密度才不會被稀釋
  const sizeMul=(TN*TN)/9;
  const squadKeys=Array.from({length:prologue?2:Math.round((4+Math.min(3,i))*sizeMul)},()=>zs[rand(zs.length)]);
  // 每層至少出現一種專屬新怪；取代既有隊伍，因此總隊伍數不增加。
  const special=floorSpecies.length?floorSpecies[i%floorSpecies.length]:null;
  const specialSlot=special&&squadKeys.length?rand(squadKeys.length):-1;
  if(specialSlot>=0)squadKeys[specialSlot]='floor_'+special.k;
  // 再用另一個既有隊伍位置展示區域生態種；只替換、不增加怪物隊伍數量。
  const regional=regionalSpecies.length?regionalSpecies[(i*2+stage)%regionalSpecies.length]:null;
  let regionalSlot=regional&&squadKeys.length>1?rand(squadKeys.length):-1;
  if(regionalSlot===specialSlot)regionalSlot=(regionalSlot+1)%squadKeys.length;
  if(regionalSlot>=0)squadKeys[regionalSlot]='region_'+regional.k;
  if(isLast) squadKeys.push('bossGuard');
  mobs=[];
  squadKeys.forEach((sq,id)=>{
    let c=null;
    for(let t=0;t<200;t++){
      const q=cells[rand(cells.length)];
      if(!isFree(q))continue;
      if(Math.abs(q[0]-start[0])+Math.abs(q[1]-start[1])<4)continue;
      c=claim(q);break;
    }
    if(!c)return;
    const S0=SQUADS[sq]; const roster=S0.roster();
    const hasBoss=roster.some(k=>FOES[k]&&FOES[k].boss);
    const icon=(sq==='bossGuard')?(ZONE_BOSS[S.zone||0]||'boss'):S0.icon;
    const elite=((i+1)%4===0&&!isLast&&id===specialSlot);
    mobs.push({id,sq,n:(elite?'精英・':'')+S0.n,icon,art:icon,speed:S0.speed,
      delta:S0.delta||1,trait:S0.trait||null,
      roster,size:roster.length,boss:hasBoss,elite,
      x:c[0],y:c[1],hx:c[0],hy:c[1],dir:rand(4),
      state:'patrol',lost:0,path:[],tick:0,alive:1,inBattle:0});
  });
  // 壁畫：挑幾面「相鄰有地板」的牆
  murals={};
  const mk=Z.murals.filter(k=>!muralSeen[k]);
  let placed=0;
  for(let t=0;t<400&&placed<mk.length;t++){
    const x=rand(MSZ),y=rand(MSZ);
    if(grid[y][x]!=='W')continue;
    const adj=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>
      x+a>=0&&y+b>=0&&x+a<MSZ&&y+b<MSZ&&grid[y+b][x+a]!=='W');
    if(!adj.length)continue;
    if(murals[x+','+y])continue;
    murals[x+','+y]=mk[placed++];
  }
  // 地面陷阱：隨機撒在通道上（避開起點與重要道具）
  traps={};
  const trapKeys=Object.keys(TRAPS);
  const nTraps=prologue?0:Math.round((4+rand(3))*((TN*TN)/9));
  for(let t=0,tries=0;t<nTraps&&tries<300;tries++){
    const c=cells[rand(cells.length)];
    if(!isFree(c))continue;                    // 佔用表已含怪物與所有道具
    if(Math.abs(c[0]-start[0])+Math.abs(c[1]-start[1])<3)continue;
    claim(c);
    traps[c[0]+','+c[1]]=trapKeys[rand(trapKeys.length)];
    t++;
  }
  // 錯題幽靈：把答錯的題目放回迷宮，形成間隔複習
  if((S.wrong||[]).length){
    const n=Math.min(3,S.wrong.length);
    for(let t=0,tries=0;t<n&&tries<200;tries++){
      const c=cells[rand(cells.length)];
      if(!isFree(c))continue;
      if(Math.abs(c[0]-start[0])+Math.abs(c[1]-start[1])<4)continue;
      claim(c);
      props.push({t:'wraith',x:c[0],y:c[1],alive:1,w:S.wrong[t]});
      t++;
    }
  }
  seen=Array.from({length:MSZ},()=>new Uint8Array(MSZ));
  P.x=start[0];P.y=start[1];P.ax=P.x;P.ay=P.y;P.dir=rand(4);
  P.ang=P.dir*Math.PI/2;P.aang=P.ang;
  turnNo=0;$('floorTag').textContent=(i+1)+'F・'+actName;
  S.key=false;                       // 每層都要重新找鑰匙
  spawnRivals(i);   // 需在 P 定位後呼叫，才能避開玩家附近
  if(FB.ready&&FB.room){ fbWatchWorld(); fbPush({floor:i}); fbPushDeck(); }
  markSeen();
  toast(F.n+'　先找到鑰匙',2600);
  if(prologue&&!S.meta.prologueSupplySeen)setTimeout(prologueSupplyScreen,180);
}

function bfsStep(sx,sy,tx,ty){
  if(sx===tx&&sy===ty)return null;
  const K=(x,y)=>y*MW+x,prev=new Map([[K(sx,sy),null]]),q=[[sx,sy]];
  for(let h=0;h<q.length;h++){
    const [x,y]=q[h];
    if(x===tx&&y===ty){
      let cur=K(x,y);
      while(true){const p=prev.get(cur);if(!p)return null;
        if(prev.get(K(p[0],p[1]))===null)return [x0(cur),y0(cur)];
        cur=K(p[0],p[1]);}
    }
    for(const [dx,dy] of DIRV){
      const nx=x+dx,ny=y+dy;
      if(!walkable(nx,ny)||prev.has(K(nx,ny)))continue;
      if(mobs.some(m=>m.alive&&m.x===nx&&m.y===ny)&&!(nx===tx&&ny===ty))continue;
      prev.set(K(nx,ny),[x,y]);q.push([nx,ny]);
    }
  }
  function x0(k){return k%MW;} function y0(k){return (k/MW)|0;}
  return null;
}

function bfsDist(sx,sy,tx,ty){
  const K=(x,y)=>y*MW+x,d=new Map([[K(sx,sy),0]]),q=[[sx,sy]];
  for(let h=0;h<q.length;h++){
    const [x,y]=q[h],dd=d.get(K(x,y));
    if(x===tx&&y===ty)return dd;
    for(const [dx,dy] of DIRV){
      const nx=x+dx,ny=y+dy;
      if(!walkable(nx,ny)||d.has(K(nx,ny)))continue;
      d.set(K(nx,ny),dd+1);q.push([nx,ny]);
    }
  }
  return 99;
}

function losClear(x0,y0,x1,y1){
  const st=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))*2;
  for(let i=1;i<st;i++){
    const ix=Math.round(x0+(x1-x0)*i/st),iy=Math.round(y0+(y1-y0)*i/st);
    if(!walkable(ix,iy))return false;
  }
  return true;
}

function inCone(m,tx,ty,depth=5){
  const [dx,dy]=DIRV[m.dir],sx=-dy,sy=dx,rx=tx-m.x,ry=ty-m.y;
  const f=rx*dx+ry*dy;
  if(f<1||f>depth)return false;
  if(Math.abs(rx*sx+ry*sy)>Math.floor(f/2))return false;
  return losClear(m.x,m.y,tx,ty);
}

function coneTiles(m,depth=5){
  const out=[],[dx,dy]=DIRV[m.dir],sx=-dy,sy=dx;
  for(let f=1;f<=depth;f++)for(let s=-(f>>1);s<=(f>>1);s++){
    const tx=m.x+dx*f+sx*s,ty=m.y+dy*f+sy*s;
    if(walkable(tx,ty)&&losClear(m.x,m.y,tx,ty))out.push([tx,ty]);
  }
  return out;
}

function markSeen(){
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const x=P.x+dx,y=P.y+dy;
    if(x>=0&&y>=0&&x<MW&&y<MH)seen[y][x]=1;
  }
}

function moveMob(m,nx,ny){
  if(mobs.some(o=>o.alive&&o!==m&&o.x===nx&&o.y===ny))return;
  const dx=nx-m.x,dy=ny-m.y;
  m.prevX=m.x;m.prevY=m.y;m.prevDir=m.dir;
  m.dir=dx===1?1:dx===-1?3:dy===1?2:0;
  m.x=nx;m.y=ny;
}

function mobStep(m){
  if(m.state==='alert'){
    const st=bfsStep(m.x,m.y,P.x,P.y);
    if(st)moveMob(m,st[0],st[1]);
  }else{
    if(!m.path||!m.path.length){
      for(let t=0;t<12;t++){
        const tx=m.hx+rand(9)-4,ty=m.hy+rand(9)-4;
        if(walkable(tx,ty)&&bfsDist(m.hx,m.hy,tx,ty)<=6){m.path=[tx,ty];break;}
      }
    }
    if(m.path&&m.path.length){
      const st=bfsStep(m.x,m.y,m.path[0],m.path[1]);
      if(st)moveMob(m,st[0],st[1]);else m.path=[];
      if(m.x===m.path[0]&&m.y===m.path[1])m.path=[];
    }
  }
}

function worldTick(){
  turnNo++;$('turnN').textContent='TURN '+turnNo;
  let spotted=false,engage=[];
  for(const m of mobs){
    if(!m.alive||m.inBattle)continue;
    if(inCone(m,P.x,P.y)){
      if(m.state!=='alert'){m.state='alert';spotted=true;}
      m.lost=0;
    }else if(m.state==='alert'&&++m.lost>4){m.state='patrol';m.path=[];}
    if(++m.tick>=m.speed){m.tick=0;mobStep(m);}
    if(m.x===P.x&&m.y===P.y)engage.push(m);   // 踏進同一格 → 開戰
  }
  if(spotted)banner();
  return engage;
}

function banner(){
  const b=$('alertBanner');b.classList.add('on');
  clearTimeout(banner._t);banner._t=setTimeout(()=>b.classList.remove('on'),1200);
}

function act(a){
  if(busy||!running)return;
  if(a==='tl'||a==='tr'){
    P.dir=(P.dir+(a==='tl'?3:1))%4;P.ang=P.dir*Math.PI/2;startAnim('turn');return;
  }
  const [fx,fy]=DIRV[P.dir],[rx,ry]=DIRV[(P.dir+1)%4];
  let dx=0,dy=0;
  if(a==='fw'){dx=fx;dy=fy;}else if(a==='bk'){dx=-fx;dy=-fy;}
  else if(a==='sl'){dx=-rx;dy=-ry;}else if(a==='sr'){dx=rx;dy=ry;}
  if(a!=='wait'){
    const nx=P.x+dx,ny=P.y+dy;
    // 封印門：解一元一次方程式才能開啟
    if(nx>=0&&ny>=0&&nx<MW&&ny<MH&&grid[ny][nx]==='L'&&!S.key){ doorPuzzle(); return; }
    if(!walkable(nx,ny)){
      const mk=murals[nx+','+ny];
      if(mk){ muralEvent(mk,nx+','+ny); return; }     // 壁畫：撞上去就互動
      bump();return;
    }
    const mob=mobs.find(m=>m.alive&&m.x===nx&&m.y===ny);
    if(mob){chargeInto(mob);return;}      // 主動衝擊 → 直接開戰
    P.x=nx;P.y=ny;
  }
  startAnim('move');
}

function chargeInto(m){
  busy=true;
  /* 鎖定接觸瞬間的位置與面向，避免衝刺動畫期間的狀態更新讓背刺方向失真。 */
  const contact={playerX:P.x,playerY:P.y,monsterX:m.x,monsterY:m.y,monsterDir:m.dir};
  const s=$('screen');
  s.style.transition='transform .13s ease-out';
  s.style.transform='scale(1.18)';
  setTimeout(()=>{
    s.style.transform='';s.style.transition='transform .07s';
    busy=false;
    startBattle([m],true,contact);
  },150);
}

function startAnim(kind){
  busy=true;
  const t0=performance.now(),fx=P.ax,fy=P.ay,fa=P.aang;
  let ta=P.ang;
  while(ta-fa>Math.PI)ta-=Math.PI*2;
  while(ta-fa<-Math.PI)ta+=Math.PI*2;
  const dur=kind==='turn'?TURN_MS:MOVE_MS;
  (function step(now){
    const k=Math.min(1,(now-t0)/dur),e=k<.5?2*k*k:1-((-2*k+2)**2)/2;
    P.ax=fx+(P.x-fx)*e;P.ay=fy+(P.y-fy)*e;P.aang=fa+(ta-fa)*e;
    if(k<1)requestAnimationFrame(step);
    else{P.ax=P.x;P.ay=P.y;P.aang=P.ang;busy=false;if(kind==='move')afterMove();}
  })(t0);
}

function bump(){const s=$('screen');s.style.transform='translateX(4px)';setTimeout(()=>s.style.transform='',70);}

function afterMove(){
  markSeen();
  fbPush();
  for(const p of props){
    if(!p.alive||p.x!==P.x||p.y!==P.y)continue;
    if(p.t==='key'){p.alive=0;fbMarkProp(p);S.key=true;fbMarkDoor();updBar();toast('取得鑰匙 — 封印門解除',2000);}
    else if(p.t==='chest'){p.alive=0;fbMarkProp(p);running=false;B_quizDone=0;chestLucky=false;openChest();return;}
    else if(p.t==='npc'){npcEnter(p);return;}
    else if(p.t==='shrine'){running=false;enterShrineFacility(p);return;}
    else if(p.t==='forge'){
      running=false;enterForgeFacility(p);return;
    }
    else if(p.t==='beastshrine'){running=false;enterBeastShrine(p);return;}
    else if(p.t==='wraith'){p.alive=0;wrongEvent(p.w);return;}
    else if(p.t==='numline'){lineEvent(p);return;}
    else if(p.t==='bed'){bedRest(p);return;}
    else if(p.t==='gemchest'){gemChest(p);return;}
    else if(p.t==='cardchest'){cardChest(p);return;}
    else if(p.t==='restout'){leaveRest();return;}
    else if(p.t==='waypoint'){running=false;waypointScreen(p);return;}
    else if(p.t==='shop'){running=false;shopPuzzle(p);return;}
    else if(p.t==='stair'){
      if(!S.key){ toast('樓梯被封印了 — 先找到這一層的鑰匙',2000); continue; }
      if(firstDungeonPrologueActive()){
        teacherPrologueEncounter();return;
      }
      const nextFloor=fl+1;
      /* 目前輪迴只允許完成一個新樓層；成功抵達樓梯即完成本輪，
         下一層會在結算後永久解鎖，避免第一次進場一路衝完整區域。 */
      if(nextFloor>=rebirthFloorLimit()){
        completeRebirthFloor();return;
      }
      if(nextFloor%3===0){
        S.zoneProgress=S.zoneProgress||{};
        const k=zoneOf().k;S.zoneProgress[k]=Math.max(Number(S.zoneProgress[k])||0,nextFloor);
        saveChar();toast('✓ 已保存 '+(nextFloor+1)+'F 休息檢查點',1800);
      }
      running=false;loadFloor(nextFloor);running=true;return;
    }
    else if(p.t==='exit'){
      if(!S.key){ toast('出口被封印了 — 先找到鑰匙',2000); continue; }
      if(mobs.some(m=>m.alive&&m.boss))toast('地獄守衛尚未擊倒',1500);
      else{running=false;winGame();return;}
    }
  }
  if(restSave){ markSeen(); updBar(); return; }   // 密室內沒有怪物與陷阱
  const tk=traps[P.x+','+P.y];
  if(tk){ trapEvent(tk,P.x,P.y); return; }
  if(checkEncounter()) return;
  rivalTick();
  if(checkRival()) return;
  const engage=worldTick();
  updBar();
  if(engage.length)startBattle(engage);
}

function gStart(x,y){gsX=x;gsY=y;}

function gEnd(x,y){
  const dx=x-gsX, dy=y-gsY, ax=Math.abs(dx), ay=Math.abs(dy);
  if(Math.max(ax,ay)<SWIPE_MIN) return;
  if(ay>ax) act(dy<0?'fw':'bk');
  else act(dx<0?'tl':'tr');
}

function bindTap(el,a){
  const go=e=>{e.preventDefault();e.stopPropagation();act(a);};
  el.addEventListener('touchstart',go,{passive:false});
  el.addEventListener('mousedown',go);
}

function drawMonsterNameSignature(g,R,kind,phase,fm){
  const id=monsterIdentity(kind),s=id.species.id,t=id.theme.id,h=id.hash,ink='#170f25',hi=(fm&&fm.hi)||'#d9f5ff',mid=(fm&&fm.col)||'#7aa0c8',white='#fff8cf';
  if(phase==='back'){
    if(s==='wing'){R(1,10,8,3,ink);R(2,8,7,3,hi);R(23,10,8,3,ink);R(23,8,7,3,hi);R(2,14,6,5,mid);R(24,14,6,5,mid);}
    else if(s==='dragon'){R(3,7,5,2,ink);R(4,5,3,3,hi);R(24,6,4,2,ink);R(27,5,2,3,hi);R(24,23,7,3,ink);R(28,20,3,4,mid);}
    else if(s==='horn'){R(7,4,4,6,ink);R(8,2,2,6,hi);R(21,4,4,6,ink);R(22,2,2,6,hi);}
    else if(s==='shell'){R(3,11,8,14,ink);R(4,12,7,12,mid);R(21,11,8,14,ink);R(21,12,7,12,mid);}
    else if(s==='insect'){for(let y=13;y<=23;y+=5){R(2,y,7,1,ink);R(23,y,7,1,ink);}R(10,4,2,6,hi);R(20,4,2,6,hi);}
    else if(s==='rabbit'){R(9,1,5,10,ink);R(10,2,3,8,hi);R(18,1,5,10,ink);R(19,2,3,8,hi);R(25,24,4,4,white);}
    else if(s==='fox'){R(7,4,6,7,ink);R(8,5,4,5,hi);R(19,4,6,7,ink);R(20,5,4,5,hi);R(24,21,7,4,ink);R(26,18,5,4,mid);R(23,26,7,3,hi);}
    else if(s==='beast'){R(7,6,5,5,ink);R(8,6,3,3,hi);R(20,6,5,5,ink);R(21,6,3,3,hi);R(24,24,7,2,ink);R(29,20,2,5,mid);}
    else if(s==='aqua'){R(2,15,7,5,ink);R(3,16,6,3,hi);R(23,14,8,6,ink);R(24,15,6,4,mid);R(12,26,8,4,hi);}
    else if(s==='serpent'){R(4,22,7,5,ink);R(3,25,8,3,mid);R(21,23,8,5,ink);R(23,25,7,3,hi);R(8,5,3,7,hi);R(21,5,3,7,hi);}
    else if(s==='plant'){R(7,3,3,8,ink);R(5,2,5,3,hi);R(22,3,3,8,ink);R(22,2,5,3,hi);R(3,6,5,3,mid);R(24,6,5,3,mid);}
    else if(s==='construct'){R(3,12,8,7,ink);R(4,13,6,5,mid);R(21,12,8,7,ink);R(22,13,6,5,mid);R(8,25,6,5,ink);R(18,25,6,5,ink);}
    else{R(4,22,4,5,hi);R(2,18,3,3,mid);R(24,23,4,5,hi);R(28,18,3,3,mid);}
    return;
  }
  /* 名稱中的元素概念會成為額飾／胸徽，學生不用只靠顏色辨認。 */
  if(t==='star'){R(15,2,2,7,white);R(12,5,8,2,hi);R(15,4,2,3,'#ffe36d');}
  else if(t==='rune'){R(14,17,1,6,white);R(18,17,1,6,white);R(15,19,3,1,hi);R(15,22,3,1,hi);}
  else if(t==='crystal'){R(15,3,3,2,white);R(14,5,5,4,hi);R(15,9,3,2,mid);}
  else if(t==='flame'){R(14,4,2,5,'#ffcf55');R(16,2,3,7,'#ff654f');R(19,5,2,4,'#ff9c45');}
  else if(t==='water'){R(15,3,3,2,white);R(14,5,5,5,'#66d5ff');R(15,9,3,2,'#318ac9');}
  else if(t==='wind'){R(11,4,10,1,white);R(14,6,9,1,hi);R(9,8,9,1,hi);}
  else if(t==='earth'){R(13,5,3,4,'#9b744c');R(16,3,4,6,'#d0a36a');R(20,6,2,3,'#795637');R(15,7,5,1,white);}
  else if(t==='shadow'){R(14,3,6,7,'#b794ff');R(16,3,5,5,ink);R(20,7,2,2,white);}
  else if(t==='geometry'){R(16,3,1,1,white);R(14,4,5,1,hi);R(13,5,1,4,hi);R(19,5,1,4,hi);R(14,9,5,1,hi);}
  else{R(14,4,2,2,white);R(18,4,2,2,white);R(16,7,2,2,hi);}
  /* 胸口只保留一個大型徽記，避免縮小後八種細線全部混成雜訊。 */
  const mark=(h>>>6)%4,mc=['#ffe05e','#62ddff','#ff7da8','#8ff083'][h%4];
  R(14,19,5,5,ink);
  if(mark===0)R(15,20,3,3,mc);
  else if(mark===1){R(16,20,1,3,mc);R(15,21,3,1,mc);}
  else if(mark===2){R(15,20,1,3,mc);R(17,20,1,3,mc);}
  else{R(16,20,1,1,white);R(15,21,3,2,mc);}
}

function drawUltimateFoe(g,kind,R){
  const m=String(kind||'').match(/^fusion_t7_([1-6])$/);if(!m)return false;
  const n=Number(m[1]),ink='#170f25',gold='#ffd85a',white='#fff7d1';
  g.globalAlpha=.22;R(3,5,26,23,n===1?'#ff553c':n===2?'#7658ff':n===3?'#ff9d36':n===4?'#3ee1db':n===5?'#d83cff':'#62a8ff');g.globalAlpha=1;
  if(n===1){ /* 創世數理神龍：雙翼、龍角、紅金胸甲、長尾 */
    R(1,8,8,4,ink);R(2,6,6,3,'#f04c38');R(23,8,8,4,ink);R(24,6,6,3,'#f04c38');
    R(5,12,7,10,'#8f2435');R(20,12,7,10,'#8f2435');R(2,14,5,5,'#f04c38');R(25,14,5,5,'#f04c38');
    R(10,5,12,8,ink);R(11,6,10,7,'#d63a32');R(9,1,4,6,gold);R(19,1,4,6,gold);R(14,3,4,3,white);
    R(8,13,16,12,ink);R(9,14,14,10,'#b82f39');R(13,14,6,9,gold);R(14,15,4,6,'#fff0a0');
    R(11,9,3,2,white);R(18,9,3,2,white);R(12,9,1,1,'#4ff1ff');R(19,9,1,1,'#4ff1ff');
    R(10,24,5,6,ink);R(17,24,5,6,ink);R(27,21,4,3,ink);R(29,18,3,4,'#d63a32');
  }else if(n===2){ /* 無限星環聖獸：宇宙鬃毛、星環、四足 */
    R(3,5,26,2,'#a98cff');R(1,9,6,2,'#62e8ff');R(25,9,6,2,'#62e8ff');R(5,25,22,2,'#a98cff');
    R(7,7,18,16,ink);R(9,8,14,14,'#5543a9');R(5,11,5,8,'#36266f');R(22,11,5,8,'#36266f');
    R(11,4,10,5,'#8b6cff');R(14,1,4,4,gold);R(8,6,3,3,'#62e8ff');R(21,6,3,3,'#62e8ff');
    R(11,12,3,3,white);R(18,12,3,3,white);R(12,13,1,1,'#151034');R(19,13,1,1,'#151034');
    R(13,17,6,4,'#221745');R(14,18,4,2,gold);R(7,22,5,8,ink);R(20,22,5,8,ink);
    [[3,3],[27,3],[2,22],[28,23],[15,29]].forEach(p=>{R(p[0],p[1],2,2,white);R(p[0]+1,p[1]-1,1,4,'#62e8ff');});
  }else if(n===3){ /* 時空演算天凰：大型羽翼、日輪、三束尾羽 */
    R(12,1,8,3,gold);R(9,4,14,2,'#ffdb74');R(4,5,24,2,'#ff9c32');
    R(1,7,10,5,ink);R(2,8,9,4,'#ef6b35');R(0,13,12,6,ink);R(1,14,11,4,'#ff9c32');
    R(21,7,10,5,ink);R(21,8,9,4,'#ef6b35');R(20,13,12,6,ink);R(20,14,11,4,'#ff9c32');
    R(11,7,10,16,ink);R(12,8,8,14,'#e84d38');R(14,4,4,6,white);R(12,10,3,2,white);R(18,10,3,2,white);
    R(13,15,6,5,gold);R(15,16,2,3,white);R(7,21,6,3,'#52d9e8');R(13,22,6,3,'#ff9c32');R(19,21,6,3,'#b66cff');
    R(8,24,4,7,ink);R(14,24,4,8,ink);R(20,24,4,7,ink);R(9,24,2,6,'#52d9e8');R(15,24,2,7,gold);R(21,24,2,6,'#b66cff');
  }else if(n===4){ /* 真理晶界麒麟：晶角、四足、青金甲片 */
    R(12,1,3,8,gold);R(15,3,3,5,'#74ffff');R(18,5,4,3,white);R(8,7,16,10,ink);R(9,8,14,8,'#36aeb4');
    R(10,10,3,3,white);R(18,10,3,3,white);R(11,11,1,1,'#13313a');R(19,11,1,1,'#13313a');
    R(5,15,22,10,ink);R(6,16,20,8,'#237d95');R(8,16,5,4,'#74ffff');R(14,16,5,4,gold);R(20,16,4,4,'#74ffff');
    R(6,23,5,8,ink);R(9,24,4,7,'#36aeb4');R(20,23,5,8,ink);R(19,24,4,7,'#36aeb4');
    R(2,17,5,3,gold);R(0,14,4,4,'#74ffff');R(27,18,4,3,gold);R(29,15,3,4,'#74ffff');
  }else if(n===5){ /* 混沌機率魔神：彎角、四臂、機率核心 */
    R(5,1,6,3,'#ba3be0');R(3,3,5,5,ink);R(21,1,6,3,'#ba3be0');R(24,3,5,5,ink);
    R(9,5,14,10,ink);R(10,6,12,8,'#642071');R(11,9,3,3,'#ff5edb');R(18,9,3,3,'#ff5edb');
    R(6,14,20,12,ink);R(8,15,16,10,'#45174f');R(13,16,6,7,'#d83cff');R(15,18,2,2,white);
    R(1,12,7,4,ink);R(2,13,6,2,'#9a32bf');R(0,19,8,4,ink);R(2,20,6,2,'#d83cff');
    R(24,12,7,4,ink);R(24,13,6,2,'#9a32bf');R(24,19,8,4,ink);R(24,20,6,2,'#d83cff');
    R(8,25,6,6,ink);R(18,25,6,6,ink);R(4,27,3,3,'#ff5edb');R(26,27,3,3,'#ff5edb');
  }else{ /* 六域知識守護者：六色冠、白金神甲、卷軸盾 */
    ['#ff6262','#ffb84d','#ffe45e','#62da85','#55bfff','#a675ff'].forEach((c,i)=>R(3+i*5,2+(i%2),4,4,c));
    R(8,5,16,10,ink);R(9,6,14,8,'#f4e8c8');R(11,9,3,3,'#55bfff');R(18,9,3,3,'#55bfff');
    R(7,15,18,12,ink);R(8,16,16,10,'#e7d9b8');R(13,16,6,9,gold);R(15,18,2,5,white);
    R(1,13,7,13,ink);R(2,14,5,11,'#4d83cc');R(3,16,3,2,white);R(25,9,3,17,ink);R(26,10,1,15,gold);R(23,8,7,3,white);
    R(9,26,5,5,ink);R(18,26,5,5,ink);R(3,28,3,2,'#62da85');R(26,28,3,2,'#a675ff');
  }
  return true;
}

function addHighTierPixelDetails(g,kind,tier,fm){
  if(tier<4)return;
  g.save();g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;
  const H=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);},dark='#120b1d',white='#fff9dc',pale='#bff7ff';
  const sparkle=(x,y,c)=>{H(x-2,y,5,1,c);H(x,y-2,1,5,c);H(x,y,1,1,white);};
  if(tier===4||tier===5){
    const accent=(fm&&fm.hi)||pale;
    /* 高解析只補大面積高光，不再繪製甲片縫、散落符文與細碎能量線。 */
    H(22,28,5,2,white);H(37,28,5,2,white);
    H(29,42,6,4,tier===5?'#ffd65c':accent);H(31,43,2,2,white);
    if(tier===5){H(7,11,4,4,accent);H(53,11,4,4,accent);}
    g.restore();return;
  }
  if(tier===6){
    const hi=(fm&&fm.hi)||pale,form=Number(fm&&fm.form)||0;
    /* 六階只保留亮眼、單一大核心與兩枚對稱標誌。 */
    H(21,28,5,2,white);H(38,28,5,2,white);
    H(28,38,8,8,dark);H(30,40,4,4,hi);H(31,41,2,2,white);
    if(form%3===0){H(12,18,8,4,hi);H(44,18,8,4,hi);}
    else if(form%3===1){H(8,24,7,5,hi);H(49,24,7,5,hi);}
    else{H(28,8,8,4,hi);H(18,52,6,3,hi);H(40,52,6,3,hi);}
  }else{
    const n=Number((String(kind).match(/^fusion_t7_([1-6])$/)||[])[1])||1;
    const accent=['','#ffd75a','#62e8ff','#ffb348','#7effef','#ff61df','#7dbdff'][n];
    /* 七階維持 64×64，但只以大色塊強化一項最重要的輪廓特徵。 */
    H(22,22,6,2,white);H(37,22,6,2,white);H(29,35,7,5,dark);H(31,36,3,3,accent);
    sparkle(7,8,accent);sparkle(56,10,accent);
    if(n===1){ /* 神龍：寬翼與龍爪 */
      H(5,15,14,5,accent);H(45,15,14,5,accent);H(18,55,5,5,white);H(41,55,5,5,white);
    }else if(n===2){ /* 星環聖獸：單一完整星環 */
      H(7,10,18,3,accent);H(39,10,18,3,accent);H(14,52,12,3,accent);H(38,52,12,3,accent);
    }else if(n===3){ /* 天凰：三束大尾羽 */
      H(16,45,6,16,'#5ce7ef');H(29,45,6,18,accent);H(42,45,6,16,'#b477ff');
    }else if(n===4){ /* 麒麟：巨大晶角與亮蹄 */
      H(28,5,8,12,white);H(30,3,4,14,accent);H(15,56,10,4,accent);H(39,56,10,4,accent);
    }else if(n===5){ /* 魔神：四臂核心 */
      [[8,27],[8,43],[56,27],[56,43]].forEach(p=>{H(p[0]-4,p[1]-4,8,8,dark);H(p[0]-2,p[1]-2,4,4,accent);});
      H(28,34,8,10,accent);H(30,37,4,4,white);
    }else{ /* 知識守護者：六色冠與大盾 */
      const cols=['#ff6262','#ffb84d','#ffe45e','#62da85','#55bfff','#a675ff'];
      cols.forEach((c,i)=>H(5+i*9,7+(i%2)*3,6,5,c));
      H(5,28,11,22,dark);H(7,30,7,18,accent);H(27,34,10,12,'#ffd85a');
    }
  }
  g.restore();
}

const MONSTER_ATLAS_RUNTIME=window.CLASS_RPG_MONSTER_ATLAS||null;
const MONSTER_ATLAS_IMAGE=MONSTER_ATLAS_RUNTIME?new Image():null;
if(MONSTER_ATLAS_IMAGE){
  MONSTER_ATLAS_IMAGE.decoding='async';
  MONSTER_ATLAS_IMAGE.onload=()=>{
    if(typeof PET_CARD_ART_CACHE!=='undefined')PET_CARD_ART_CACHE.clear();
    document.querySelectorAll('.monsterSprite[data-monster-kind]').forEach(oldSprite=>{
      const replacement=foeArt(oldSprite.dataset.monsterKind);
      if(replacement.dataset.atlasReady==='1'){
        replacement.className=oldSprite.className;
        oldSprite.replaceWith(replacement);
      }
    });
    if(typeof B!=='undefined'&&B&&!B.over&&typeof renderFoes==='function')renderFoes();
  };
  MONSTER_ATLAS_IMAGE.src='./assets/monsters/'+MONSTER_ATLAS_RUNTIME.image;
}
function drawMonsterAtlasFrame(g,c,kind){
  const frame=MONSTER_ATLAS_RUNTIME&&MONSTER_ATLAS_RUNTIME.frames&&MONSTER_ATLAS_RUNTIME.frames[kind];
  if(!frame||!MONSTER_ATLAS_IMAGE||!MONSTER_ATLAS_IMAGE.complete||!MONSTER_ATLAS_IMAGE.naturalWidth)return false;
  g.save();g.imageSmoothingEnabled=false;g.clearRect(0,0,c.width,c.height);
  g.drawImage(MONSTER_ATLAS_IMAGE,frame.x,frame.y,frame.width,frame.height,0,0,c.width,c.height);
  g.restore();return true;
}

/*
 * 量產怪物不逐隻呼叫繪圖模型：六冊的一階怪物依種族挑選精繪母體，
 * 再於 64px 畫布重配色、加上名稱主題紋章及輪廓零件。高階融合與 Boss
 * 仍走原有的專屬程序美術，避免兩百多張圖片拖慢手機載入。
 */
const MONSTER_ATLAS_FAMILY_TEMPLATES={
  plant:['rm1_1'],fox:['rm3_1','rm2_2'],beast:['rm2_2','rm1_10','rm4_6'],
  horn:['rm4_6'],rabbit:['rm1_10'],insect:['rm3_3','rm5_6','rm6_8'],shell:['rm6_8'],
  serpent:['rm4_2'],dragon:['rm5_7'],aqua:['rm5_7'],wing:['rm5_7'],
  construct:['rm1_6','rm6_5'],spirit:['rm1_1']
};
function monsterAtlasVariantBase(kind){
  if(MONSTER_ATLAS_RUNTIME&&MONSTER_ATLAS_RUNTIME.frames&&MONSTER_ATLAS_RUNTIME.frames[kind])return kind;
  if(!/^rm[1-6]_\d+$/.test(String(kind)))return '';
  const identity=monsterIdentity(kind),choices=MONSTER_ATLAS_FAMILY_TEMPLATES[identity.species.id];
  return choices&&choices.length?choices[identity.hash%choices.length]:'';
}
function monsterRgb(hex,fallback){
  const value=String(hex||'').match(/^#([0-9a-f]{6})$/i);
  if(!value)return fallback;
  const n=parseInt(value[1],16);return [(n>>16)&255,(n>>8)&255,n&255];
}
function recolorMonsterVariant(g,c,kind){
  const fm=FLOOR_MONSTER_LOOK[kind]||{},pal=monsterVividPalette(kind,fm),
    main=monsterRgb(pal.col,[92,139,210]),shade=monsterRgb(pal.shade,[42,67,122]),hi=monsterRgb(pal.hi,[232,246,255]),
    data=g.getImageData(0,0,c.width,c.height),p=data.data;
  for(let i=0;i<p.length;i+=4){
    if(p[i+3]<10)continue;
    const lum=(p[i]*.299+p[i+1]*.587+p[i+2]*.114)/255;
    if(lum<.16){p[i]=Math.round(shade[0]*.2);p[i+1]=Math.round(shade[1]*.2);p[i+2]=Math.round(shade[2]*.2);continue;}
    const t=lum<.48?(lum-.16)/.32:(lum-.48)/.52,a=lum<.48?shade:main,b=lum<.48?main:hi;
    p[i]=Math.round(a[0]+(b[0]-a[0])*t);p[i+1]=Math.round(a[1]+(b[1]-a[1])*t);p[i+2]=Math.round(a[2]+(b[2]-a[2])*t);
  }
  g.putImageData(data,0,0);
}
function drawMonsterVariantFeatures(g,kind){
  const id=monsterIdentity(kind),accent=MONSTER_THEME_ACCENTS[id.theme.id]||'#fff18c',ink='#211631',h=id.hash,
    ax=21+(h%20),ay=9+((h>>>4)%10),R=(x,y,w,h2,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h2);};
  /* 四種可組合輪廓零件：雙角、耳羽、尾刺、肩晶；至少一項改變母體剪影。 */
  switch((h>>>7)%4){
    case 0:R(12,7,3,8,ink);R(49,7,3,8,ink);R(13,6,2,7,accent);R(49,6,2,7,accent);break;
    case 1:R(6,23,7,3,ink);R(51,23,7,3,ink);R(5,20,6,3,accent);R(53,20,6,3,accent);break;
    case 2:R(53,37,7,3,ink);R(58,34,3,3,ink);R(54,37,5,2,accent);break;
    default:R(14,17,5,6,ink);R(45,17,5,6,ink);R(15,16,3,5,accent);R(46,16,3,5,accent);
  }
  /* 名稱主題紋章使用大像素，不畫細線，64px 手機畫面仍看得見。 */
  if(id.theme.id==='geometry'){R(ax,ay+5,3,3,ink);R(ax+3,ay+2,3,3,ink);R(ax+6,ay+5,3,3,ink);R(ax+1,ay+5,7,2,accent);}
  else if(id.theme.id==='chance'){R(ax,ay,9,9,ink);R(ax+2,ay+2,2,2,accent);R(ax+5,ay+5,2,2,accent);}
  else if(id.theme.id==='crystal'){R(ax+3,ay,3,3,accent);R(ax,ay+3,9,4,ink);R(ax+2,ay+2,5,7,accent);}
  else if(id.theme.id==='flame'){R(ax+3,ay,3,4,accent);R(ax,ay+4,9,5,ink);R(ax+2,ay+3,5,5,accent);}
  else if(id.theme.id==='water'){R(ax+3,ay,3,3,accent);R(ax+1,ay+3,7,5,ink);R(ax+2,ay+3,5,4,accent);}
  else if(id.theme.id==='shadow'){R(ax+2,ay,6,9,accent);R(ax+5,ay,4,6,ink);}
  else if(id.theme.id==='star'){R(ax+3,ay,3,9,accent);R(ax,ay+3,9,3,accent);}
  else {R(ax,ay+1,9,3,ink);R(ax,ay+6,9,3,ink);R(ax+1,ay+2,7,1,accent);R(ax+1,ay+6,7,1,accent);}
}
function drawMonsterAtlasVariant(g,c,kind,baseKind){
  if(!baseKind||!drawMonsterAtlasFrame(g,c,baseKind))return false;
  if(baseKind!==kind){recolorMonsterVariant(g,c,kind);drawMonsterVariantFeatures(g,kind);}
  return true;
}

function monsterMotionProfile(kind){
  const frame=MONSTER_ATLAS_RUNTIME&&MONSTER_ATLAS_RUNTIME.frames&&MONSTER_ATLAS_RUNTIME.frames[kind];
  const species=frame&&frame.family||((monsterIdentity(kind).species||{}).id)||'beast';
  if(species==='wing'||species==='aqua'||species==='spirit')return 'hover';
  if(species==='insect'||species==='shell')return 'skitter';
  if(species==='dragon'||species==='serpent')return 'coil';
  if(species==='construct'||species==='horn')return 'stomp';
  if(species==='plant'||species==='rabbit')return 'bounce';
  return 'pounce';
}

function foeArt(kind){
  if(kind==='mathTeacherFinal')return teacherBattleArt();
  const artTier=monsterTier(kind),hiRes=artTier>=4||!!(FOES[kind]&&FOES[kind].boss),
    atlasBase=monsterAtlasVariantBase(kind),
    c=document.createElement('canvas');
  /* 圖集怪物直接保留 64×64 原生像素；未完成美術的程序怪仍維持 32px 輕量備援。 */
  c.width=c.height=atlasBase?64:(hiRes?64:32);
  c.dataset.monsterKind=kind;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  if(drawMonsterAtlasVariant(g,c,kind,atlasBase)){c.dataset.atlasReady='1';return c;}
  /* 圖集尚未下載完成時，先把 32px 程序備援完整放大到 64px，避免縮在左上角。 */
  if(c.width===64)g.scale(2,2);
  const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  if(drawUltimateFoe(g,kind,R)){addHighTierPixelDetails(g,kind,7,FLOOR_MONSTER_LOOK[kind]);return c;}
  const fm=FLOOR_MONSTER_LOOK[kind];
  if(fm){
    const pal=monsterVividPalette(kind,fm),look={...fm,col:pal.col,hi:pal.hi,shade:pal.shade},dark='#20172b',mid=pal.col,hi=pal.hi,eye='#fff4a3',tier=monsterTier(kind);
    /* 四～六階先畫階級光環，再疊角色本體；仍維持透明背景和 32×32 輕量規格。 */
    if(tier>=4){
      g.globalAlpha=tier===4?.18:tier===5?.24:.3;
      R(3,8,26,18,tier===4?hi:tier===5?'#ffd25e':'#a8ecff');
      g.globalAlpha=1;
    }
    drawMonsterNameSignature(g,R,kind,'back',look);
    /* 六種輪廓交錯使用；配色與細節依樓層不同，維持 32×32 輕量像素素材。 */
    if(fm.form===0){
      R(9,8,14,6,dark);R(7,12,18,13,mid);R(10,9,12,4,hi);R(5,17,4,7,dark);R(23,17,4,7,dark);
      R(10,25,5,4,dark);R(18,25,5,4,dark);
    }else if(fm.form===1){
      R(8,10,16,15,mid);R(5,13,5,10,dark);R(22,13,5,10,dark);R(11,6,4,5,hi);R(18,6,4,5,hi);
      R(9,25,5,4,dark);R(18,25,5,4,dark);
    }else if(fm.form===2){
      R(10,7,12,5,hi);R(7,11,18,15,mid);R(5,17,4,8,dark);R(23,17,4,8,dark);R(9,26,14,3,dark);
      R(13,4,6,4,mid);
    }else if(fm.form===3){
      R(13,7,6,18,mid);R(3,10,10,11,hi);R(19,10,10,11,hi);R(5,20,8,5,dark);R(19,20,8,5,dark);
      R(11,25,4,4,dark);R(17,25,4,4,dark);
    }else if(fm.form===4){
      R(8,8,16,17,mid);R(5,12,4,12,dark);R(23,12,4,12,dark);R(11,5,10,5,hi);R(10,25,5,4,dark);R(18,25,5,4,dark);
      R(3,15,3,3,hi);R(26,15,3,3,hi);
    }else{
      R(9,9,14,14,mid);R(6,5,5,8,hi);R(21,5,5,8,hi);R(4,15,6,8,dark);R(22,15,6,8,dark);
      R(10,23,5,6,dark);R(18,23,5,6,dark);
    }
    R(11,14,3,3,dark);R(18,14,3,3,dark);R(12,14,1,1,eye);R(19,14,1,1,eye);
    R(14,19,4,2,dark);R(15,9,2,2,hi);
    drawMonsterNameSignature(g,R,kind,'front',look);
    if(tier>=4){ /* 四階：只保留一枚大額飾與左右肩色塊 */
      R(13,2,6,5,dark);R(15,3,2,3,hi);R(3,13,6,4,dark);R(23,13,6,4,dark);R(4,14,4,2,hi);R(24,14,4,2,hi);
    }
    if(tier>=5){ /* 五階：兩支金角，取消四周細碎粒子 */
      R(7,2,5,6,dark);R(9,1,2,6,'#ffd25e');R(20,2,5,6,dark);R(21,1,2,6,'#ffd25e');
    }
    if(tier>=6){ /* 六階：單一星環與大型核心，不再用細框包住全身 */
      R(6,1,20,3,dark);R(8,1,16,2,'#a8ecff');
      R(12,17,8,7,dark);R(14,18,4,5,hi);R(15,19,2,2,'#ffffff');
    }
    addHighTierPixelDetails(g,kind,tier,look);
    return c;
  }
  if(kind==='duel'){
    R(11,4,10,9,'#f0d0a8');R(13,7,2,2,'#2a1a10');R(18,7,2,2,'#2a1a10');
    R(9,1,14,4,'#3a2c60');
    R(8,13,16,15,'#8fd0ff');R(8,13,16,3,'#dfe8ff');
    R(4,15,4,11,'#6a5aa0');R(24,15,4,11,'#6a5aa0');
    R(10,28,5,4,'#3a2c60');R(17,28,5,4,'#3a2c60');
    return c;
  }
  if(kind==='mush'){
    R(11,17,10,9,'#f2e4c9');R(10,25,12,4,'#d9c39c');
    R(6,8,20,9,'#e05a5a');R(4,12,24,6,'#c53f3f');R(6,8,20,3,'#f07d7d');
    R(9,10,4,4,'#fff6e0');R(19,12,5,4,'#fff6e0');R(13,20,2,2,'#3a2708');R(18,20,2,2,'#3a2708');
  }else if(kind==='bat'){
    R(13,13,6,7,'#4a3b73');R(1,10,12,6,'#2d2150');R(19,10,12,6,'#2d2150');
    R(3,8,8,4,'#3d3163');R(21,8,8,4,'#3d3163');
    R(14,15,2,2,'#e05a5a');R(17,15,2,2,'#e05a5a');R(14,20,5,2,'#fff');
  }else if(kind==='skel'){
    R(11,5,10,10,'#e8e4d8');R(13,8,3,3,'#1a1030');R(17,8,3,3,'#1a1030');R(14,12,5,2,'#1a1030');
    R(13,15,6,10,'#e8e4d8');R(9,17,3,8,'#e8e4d8');R(20,17,3,8,'#e8e4d8');
    R(12,25,3,5,'#e8e4d8');R(17,25,3,5,'#e8e4d8');
  }else if(kind==='slime'){                 // z2 代數史萊姆
    R(8,14,16,12,'#57b6ea');R(6,18,20,8,'#3f8fd0');R(8,26,16,2,'#2f6fa8');
    R(10,16,4,3,'#bfe8ff');
    R(12,20,3,3,'#0a2a4a');R(18,20,3,3,'#0a2a4a');R(14,24,4,2,'#0a2a4a');
    R(20,14,2,2,'#dfffff');R(24,18,2,2,'#dfffff');R(22,16,2,2,'#0a2a4a');
  }else if(kind==='moth'){                  // z2 符文飛蛾
    R(2,8,10,10,'#8a5ac0');R(20,8,10,10,'#8a5ac0');
    R(4,16,8,6,'#6a3aa0');R(20,16,8,6,'#6a3aa0');
    R(13,10,6,14,'#3a2450');
    R(12,6,2,4,'#c9a8f0');R(18,6,2,4,'#c9a8f0');
    R(14,12,2,2,'#ffe38a');R(17,12,2,2,'#ffe38a');
    R(6,11,2,2,'#ffe38a');R(24,11,2,2,'#ffe38a');
  }else if(kind==='garg'){                  // z3 砂岩石像鬼
    R(10,6,12,10,'#c9a86a');
    R(8,2,3,5,'#8a6a3c');R(21,2,3,5,'#8a6a3c');
    R(12,9,3,2,'#ff8a3a');R(18,9,3,2,'#ff8a3a');R(13,13,6,2,'#5a4526');
    R(9,16,14,10,'#b08a50');R(9,16,14,3,'#c9a86a');
    R(2,10,7,12,'#8a6a3c');R(23,10,7,12,'#8a6a3c');
    R(10,26,4,4,'#8a6a3c');R(18,26,4,4,'#8a6a3c');
  }else if(kind==='tri'){                   // z3 三角小鬼
    R(14,6,4,4,'#ff9a5a');R(12,10,8,4,'#ff8a3a');R(10,14,12,4,'#f0742a');
    R(8,18,16,4,'#e0651f');R(6,22,20,4,'#c9571a');
    R(12,16,2,2,'#2a1000');R(18,16,2,2,'#2a1000');R(14,19,4,2,'#2a1000');
    R(9,26,4,3,'#8a3c10');R(19,26,4,3,'#8a3c10');
  }else if(kind==='bird'){                  // z4 發條隼
    R(10,12,14,8,'#c9a44a');R(20,8,8,6,'#e0c060');
    R(28,10,3,2,'#ff8a3a');R(23,10,2,2,'#2a1a00');
    R(4,10,10,6,'#8a7a30');R(6,16,8,4,'#6b5f24');
    R(4,18,6,3,'#8a7a30');
    R(14,20,2,5,'#5a4512');R(18,20,2,5,'#5a4512');
    R(12,14,4,4,'#ffe38a');R(13,15,2,2,'#8a6f2a');
  }else if(kind==='cloud'){                 // z4 雲靈
    R(6,12,20,8,'#dfe8ff');R(4,16,24,6,'#bcd0f0');
    R(8,10,8,4,'#fff');R(18,11,6,3,'#fff');
    R(12,15,2,3,'#3a4a8a');R(19,15,2,3,'#3a4a8a');R(15,19,3,2,'#3a4a8a');
    R(8,24,2,4,'#8fd0ff');R(14,25,2,4,'#8fd0ff');R(20,24,2,4,'#8fd0ff');
  }else if(kind==='crab'){                  // z5 紫晶蟹
    R(8,12,16,10,'#6a3a7a');R(8,12,16,3,'#8a5aa0');
    R(12,7,3,6,'#e26bd6');R(17,5,3,8,'#e26bd6');R(15,9,2,4,'#f0a8e8');
    R(11,15,3,3,'#f0a8e8');R(18,15,3,3,'#f0a8e8');
    R(2,14,6,5,'#4a2a5a');R(24,14,6,5,'#4a2a5a');
    R(6,22,3,5,'#4a2a5a');R(12,24,3,4,'#4a2a5a');R(17,24,3,4,'#4a2a5a');R(23,22,3,5,'#4a2a5a');
  }else if(kind==='ghostm'){                // z5 深淵幽魂
    g.globalAlpha=.9;
    R(10,4,12,12,'#4a2a5a');R(12,7,3,3,'#e26bd6');R(17,7,3,3,'#e26bd6');
    R(8,16,16,8,'#6a3a7a');
    R(9,24,3,4,'#4a2a5a');R(15,24,3,5,'#4a2a5a');R(21,24,3,4,'#4a2a5a');
    R(13,12,6,2,'#f0a8e8');
    g.globalAlpha=1;
  }else if(kind==='dice'){                  // z6 骰子魔
    R(8,10,16,16,'#f0f0f0');R(8,10,16,3,'#fff');R(8,23,16,3,'#d0d0d8');
    R(6,5,3,6,'#c53f3f');R(23,5,3,6,'#c53f3f');
    R(11,14,3,3,'#2a1030');R(18,14,3,3,'#2a1030');R(13,21,6,2,'#2a1030');
    R(10,26,4,4,'#8a2030');R(18,26,4,4,'#8a2030');
  }else if(kind==='knight'){                // z6 緋紅騎士
    R(10,4,12,8,'#8f3648');R(10,4,12,2,'#b04a5e');
    R(14,0,4,5,'#ffe38a');
    R(12,8,8,2,'#1c0a10');
    R(8,12,16,12,'#6a2030');R(8,12,16,3,'#8f3648');
    R(2,12,6,10,'#c9a44a');R(3,14,4,6,'#8a6f2a');
    R(26,4,2,16,'#dfe8ff');R(25,20,4,2,'#8a6f2a');
    R(10,24,4,6,'#43101c');R(18,24,4,6,'#43101c');
  }else if(kind==='boss2'){                 // z2 方程巨像：藍岩魔像，胸口 ✖ 符文
    R(10,2,12,8,'#2f5f8a');R(10,2,12,2,'#57b6ea');
    R(12,5,3,3,'#bfe8ff');R(18,5,3,3,'#bfe8ff');
    R(6,10,20,14,'#1a3a5a');R(6,10,20,3,'#2f5f8a');
    R(13,14,2,2,'#57b6ea');R(17,14,2,2,'#57b6ea');R(15,16,2,2,'#57b6ea');
    R(13,18,2,2,'#57b6ea');R(17,18,2,2,'#57b6ea');
    R(2,10,4,10,'#2f5f8a');R(26,10,4,10,'#2f5f8a');
    R(2,20,4,4,'#1a3a5a');R(26,20,4,4,'#1a3a5a');
    R(9,24,5,6,'#2f5f8a');R(18,24,5,6,'#2f5f8a');
    R(6,17,20,1,'#0f2438');
  }else if(kind==='boss3'){                 // z3 幾何石像王：帶翼石像鬼＋三角冠
    R(14,0,4,3,'#ffe38a');R(12,3,8,2,'#c9a44a');
    R(10,5,12,9,'#c9a86a');
    R(7,3,3,6,'#8a6a3c');R(22,3,3,6,'#8a6a3c');
    R(12,8,3,3,'#ff8a3a');R(18,8,3,3,'#ff8a3a');R(13,12,6,2,'#5a4526');
    R(0,8,8,14,'#8a6a3c');R(24,8,8,14,'#8a6a3c');
    R(2,10,4,10,'#a08050');R(26,10,4,10,'#a08050');
    R(9,14,14,12,'#b08a50');R(9,14,14,3,'#c9a86a');
    R(9,26,5,4,'#8a6a3c');R(18,26,5,4,'#8a6a3c');
  }else if(kind==='boss4'){                 // z4 級數天守：發條鐘塔守衛
    R(13,0,6,4,'#ffe38a');R(11,4,10,3,'#c9a44a');
    R(9,7,14,10,'#4a4468');R(11,9,10,6,'#dfe8ff');
    R(15,10,2,3,'#2a2440');R(15,12,4,1,'#2a2440');
    R(2,12,5,5,'#8fd0ff');R(25,12,5,5,'#8fd0ff');
    R(3,13,3,3,'#4a4468');R(26,13,3,3,'#4a4468');
    R(7,17,18,5,'#6a5f9a');R(7,17,18,2,'#8a7ec0');
    R(11,18,3,3,'#8fd0ff');R(18,18,3,3,'#8fd0ff');
    R(5,22,22,5,'#4a4468');R(5,22,22,2,'#6a5f9a');
    R(9,27,14,4,'#2a2440');
  }else if(kind==='boss5'){                 // z5 圓環魔眼：懸浮巨眼＋魔法環
    R(4,4,24,3,'#e26bd6');R(4,25,24,3,'#e26bd6');
    R(2,6,3,20,'#e26bd6');R(27,6,3,20,'#e26bd6');
    R(8,8,16,16,'#2a1436');R(10,10,12,12,'#4a2a5a');
    R(12,12,8,8,'#f0a8e8');R(14,14,4,4,'#1c0a24');
    R(13,13,2,2,'#fff');
    R(15,2,3,3,'#f0a8e8');R(15,27,3,3,'#f0a8e8');
    R(0,14,3,3,'#f0a8e8');R(29,14,3,3,'#f0a8e8');
    R(10,26,2,4,'#4a2a5a');R(20,26,2,4,'#4a2a5a');
  }else if(kind==='boss6'){                 // z6 機率之王：披風王者＋胸前骰子
    R(6,0,3,6,'#ffb347');R(14,0,4,7,'#ffb347');R(23,0,3,6,'#ffb347');
    R(6,6,20,3,'#ffb347');R(6,8,20,2,'#c97a1a');
    R(9,10,14,8,'#8f3648');R(9,10,14,2,'#b04a5e');
    R(12,12,3,3,'#ffe38a');R(18,12,3,3,'#ffe38a');
    R(14,16,5,1,'#43101c');
    R(5,18,22,10,'#5a1020');R(5,18,22,2,'#8f3648');
    R(13,20,6,6,'#f0f0f0');R(14,21,2,2,'#c53f3f');R(17,23,2,2,'#c53f3f');
    R(2,18,3,8,'#8f3648');R(27,18,3,8,'#8f3648');
  }else{                                    // z1 地獄守衛（原始造型）
    R(5,2,3,6,'#ecc24e');R(14,0,4,7,'#ecc24e');R(24,2,3,6,'#ecc24e');
    R(5,7,22,4,'#ecc24e');R(5,9,22,2,'#a8801f');
    R(4,11,24,15,'#3a2450');R(4,11,24,3,'#54356f');
    R(8,15,5,4,'#e05a5a');R(19,15,5,4,'#e05a5a');
    R(11,21,10,3,'#1c1030');R(1,13,3,11,'#54356f');R(28,13,3,11,'#54356f');
  }
  return c;
}

function petCardArtData(kind){
  kind=String(kind||'');if(PET_CARD_ART_CACHE.has(kind))return PET_CARD_ART_CACHE.get(kind);
  try{const art=foeArt(kind).toDataURL('image/png');PET_CARD_ART_CACHE.set(kind,art);return art;}catch(e){return '';}
}

function playerShieldCap(){
  const lv=Math.max(1,Number(S.classroomLevel||S.lv)||1);
  return Math.min(44,26+(S.zone||0)*3+Math.floor(lv/30)*3);
}

function gainPlayerBlock(amount,delay){
  if(!B)return 0;
  const before=B.block||0,cap=playerShieldCap();B.block=Math.min(cap,before+Math.max(0,Math.round(amount)||0));
  const gained=B.block-before;if(gained)popPlayer('+'+gained+' 🛡','gain',delay||0);
  if(gained<Math.max(0,Math.round(amount)||0))toast('護盾已達本回合上限 '+cap,1050);
  return gained;
}

function enemyAttackScale(){
  const lv=Math.max(1,Number(S.classroomLevel||S.lv)||1);
  const importedCatchup=Math.min(.25,
    Math.max(0,(Number(S.maxhp)||100)-100)/1000+Math.max(0,Number(S.armor)||0)/250);
  const floorPressure=1+Math.min(.55,Math.max(0,fl)*.055);
  return (DIFFS[diff].atk||1)*1.08*(1+(S.zone||0)*.07)*floorPressure*(1+Math.min(.18,(lv-1)/500))*(1+importedCatchup);
}

function engagementType(m,byPlayer,contact){
  const px=contact&&Number.isFinite(contact.playerX)?contact.playerX:P.x;
  const py=contact&&Number.isFinite(contact.playerY)?contact.playerY:P.y;
  const mx=contact&&Number.isFinite(contact.monsterX)?contact.monsterX:(!byPlayer&&Number.isFinite(m.prevX)?m.prevX:m.x);
  const my=contact&&Number.isFinite(contact.monsterY)?contact.monsterY:(!byPlayer&&Number.isFinite(m.prevY)?m.prevY:m.y);
  const mdir=contact&&Number.isFinite(contact.monsterDir)?contact.monsterDir:m.dir;
  const dx=mx-px, dy=my-py;
  const rel = Math.abs(dx)>Math.abs(dy) ? (dx>0?1:3) : (dy>0?2:0); // 玩家→怪 的方位
  const [mfx,mfy]=DIRV[mdir];
  const mFacingPlayer = mdir === (rel+2)%4;   // 怪的正面朝著玩家
  const behindMonster = px===mx-mfx&&py===my-mfy; // 玩家確實站在怪物背後一格
  const fromBehind = rel === (P.dir+2)%4;      // 怪在玩家背後
  if(byPlayer){
    if(behindMonster) return 'ambush';         // 只有真正從背後接觸才算突襲
    if(m.state!=='alert') return 'preempt';    // 牠還沒發現你
    return 'normal';                           // 正面或側面接觸都不算背刺
  }
  if(m.state!=='alert'||!mFacingPlayer) return 'preempt';
  if(fromBehind) return 'back';
  return 'normal';
}

function showOpenBanner(kind){
  const b=$('openBanner');
  b.className='';void b.offsetWidth;
  const t=b.querySelector('.t'), s=b.querySelector('.s');
  if(kind==='ambush'){
    t.textContent='先 制 ！';
    s.textContent='背後突襲 · 額外一回合 · 隨機起手 5 張';
    b.classList.add('good','on');
  }else if(kind==='preempt'){
    t.textContent='先 制 攻 擊';
    s.textContent='敵人未察覺 · 額外一回合 · 隨機起手 5 張';
    b.classList.add('good','on');
  }else if(kind==='back'){
    t.textContent='被 偷 襲';
    s.textContent='敵人先攻 · 隨機起手仍為 5 張';
    b.classList.add('bad','on');
  }
}

function startBattle(list,byPlayer,contact){
  running=false;
  const lead=list[0];
  const kind=engagementType(lead,!!byPlayer,contact);
  const isPre = kind==='preempt'||kind==='ambush';
  lead.inBattle=1;
  B={foes:[],draw:freshBattleDraw(),disc:[],hand:[],
     thr:-1,chain:0,nextMul:1,block:0,best:0,over:false,waves:1,target:0,
     open:kind, skipEnemy:isPre?1:0, firstTurn:true,
     pendingLoot:0,lootGold:0,lootXp:0,lootKills:0,levelsGained:0,lootAbsorbing:false,lootCollected:false,
     victoryQueued:false,victoryFinalizing:false,
     delta:lead.delta||1, trait:lead.trait||null,
     cur:[], bestArr:[], chains:[], ults:{}};
  PARTY.forEach(m=>m.used=false);
  S.deck.forEach(o=>{ delete o._dealt; });   // 每場戰鬥手牌都重新從下方滑出
  deploySquad(lead,false);
  $('flashFx').classList.remove('go');void $('flashFx').offsetWidth;$('flashFx').classList.add('go');
  fbPush({inBattle:1});
  $('dungeon').classList.add('hide');
  const bt=$('battle');
  bt.classList.remove('hide');bt.classList.remove('enter');void bt.offsetWidth;bt.classList.add('enter');
  $('veil').classList.add('hide');
  drawFieldBg();
  if(kind!=='normal') setTimeout(()=>showOpenBanner(kind),380);
  toast('敵隊展開：'+lead.n+' ×'+lead.roster.length,1500);

  const bossFoe=B.foes.find(f=>f.boss);
  const begin=()=>{
    newTurn();
    applyFollowerSupport();
    const speaker=B.foes.find(f=>!f.dead);
    if(speaker)setTimeout(()=>monsterSay(speaker,'start',true),520);
    if(kind==='back') setTimeout(enemyStrike,900);
    startReinforceClock();
  };
  if(bossFoe) bossNpcBriefing(bossFoe,()=>bossCutscene(bossFoe,begin)); else begin();
}

function deploySquad(m,animate){
  m.roster.forEach((kind,i)=>{
    if(B.foes.filter(f=>!f.dead).length>=MAX_FOES)return;
    const base=FOES[kind];
    const fr=[[1,4],[1,3],[2,5]][rand(3)];
    const eliteMul=m.elite?1.35:1;
    const floorVitality=1+Math.min(.90,Math.max(0,fl)*.075);
    const prologue=firstDungeonPrologueActive();
    const bh=prologue?Math.max(6,Math.round(base.hp*.22)):Math.max(8,Math.round(base.hp*DIFFS[diff].hp*eliteMul*floorVitality));
    const f={...base,kind,squad:m.id,max:bh,hp:bh,atk:prologue?1:Math.round(base.atk*(m.elite?1.18:1)),burn:0,dead:false,shield:0,act:'atk',
      expr:hpExpr(bh,fl),
      fracNum:fr[0],fracDen:fr[1],
      fresh:true,delay:i*110,uid:'f'+m.id+'_'+i,row:0,intent:0};
    insertFoe(f,animate);
  });
}

function bossCutscene(f,done){
  const cut=$('bossCut');
  cut.innerHTML='';
  cut.appendChild(foeArt(f.art));
  const n=document.createElement('div');n.className='bn';n.textContent=f.n;
  const s=document.createElement('div');s.className='bs';s.textContent='FLOOR GUARDIAN · HP '+f.max;
  cut.appendChild(n);cut.appendChild(s);
  cut.classList.remove('hide');
  setTimeout(()=>{cut.classList.add('shake');},780);
  setTimeout(()=>{
    cut.classList.remove('shake');cut.classList.add('hide');
    $('flashFx').classList.remove('go');void $('flashFx').offsetWidth;$('flashFx').classList.add('go');
    done();
  },2100);
}

function bossNpcBriefing(f,done,idx=0){
  const steps=[
    {title:'先觀察再行動',html:'手牌會從牌組<b>真正隨機抽 5 張</b>。先停一下、看清費用，再安排 <b>0 → 1 → 2 → 3 → 4</b>；通用卡可跨過缺少的費用並補回法力。'},
    {title:'五連打斷 BOSS 集氣',html:'<b>連擊達 5</b> 會發動「破勢」，關閉已睜開的蓄力眼並造成額外傷害。若連擊中斷，先調整策略，不必急著責怪自己。'},
  ];
  const s=steps[Math.max(0,Math.min(steps.length-1,idx))];
  overlay(`<div class="npcbox"><div class="nhead"><canvas class="nport" id="bossCoachPort"></canvas>
      <div><div class="nname" style="color:#ffe38a">守衛教官 · 雷昂</div><div class="ntopic">${hesc(s.title)}</div></div>
      <div class="nprog">${idx+1} / ${steps.length}</div></div>
    ${idx===0?'<div class="nintro">「先別衝！這種守衛不能只靠單張大牌硬打。」</div>':''}
    <div class="dsteps"><div class="dstep now fresh"><span class="dn">${idx+1}</span><div class="dtx">${s.html}</div></div></div>
    </div><button class="go" id="bossCoachGo">${idx===steps.length-1?'開始 BOSS 戰':'下一步 ▼'}</button>`,null,el=>{
      if(el.id!=='bossCoachGo')return false;
      setTimeout(()=>idx===steps.length-1?done():bossNpcBriefing(f,done,idx+1),10);return true;
    });
  const cv=$('bossCoachPort');if(cv){cv.width=cv.height=32;cv.getContext('2d').drawImage(npcArt('guide'),0,0);}
}

function insertFoe(f,animate=true){
  f.fresh=animate;
  const frontN=B.foes.filter(x=>!x.dead&&x.row===0).length;
  f.row = (f.boss||frontN<FRONT_CAP) ? 0 : 1;
  f.intent=rollIntent(f);
  if(f.boss){ f.eyes=5+rand(4); f.open=0; }   // 5~8 顆眼睛（模擬調校）
  if(Math.random()<.5) B.foes.unshift(f); else B.foes.push(f);
}

function rollIntent(f){
  const r=Math.random();
  const t=f.battleType||'';
  if((t==='ward'||t==='regen')&&r<.28){f.act='def';f.intent=Math.round((8+rand(8))*(t==='ward'?1.3:1));}
  else if(t==='hex'&&r<.28&&!f.boss){f.act='curse';f.intent=0;}
  else if((t==='fury'||t==='chorus')&&r<.26){f.act='buff';f.intent=3;}
  else if(r<0.10){ f.act='def'; f.intent=8+rand(8); }
  else if(r<0.15){ f.act='buff'; f.intent=3; }
  else if(r<0.20 && !f.boss){ f.act='curse'; f.intent=0; }
  else {
    let mul=t==='swift'?1.18:t==='chaos'?(.78+Math.random()*.62):1;
    mul*=1-(B&&B.followerWeaken||0);
    f.act='atk'; f.intent=Math.max(2,Math.round((f.atk+rand(4))*enemyAttackScale()*(f.row?.72:1)*mul));
  }
  return f.intent;
}

function monsterSay(f,trigger,force=false){
  if(!B||B.over||!f||f.dead)return;
  const now=Date.now();
  if(!force&&((B.selTalkAt&&now-B.selTalkAt<3800)||Math.random()>.48))return;
  const field=$('field'),el=document.getElementById(f.uid);if(!field||!el)return;
  field.querySelectorAll('.foeSpeech').forEach(n=>n.remove());
  const pool=SEL_LINES[trigger]||SEL_LINES.start,d=document.createElement('div');
  d.className='foeSpeech';d.textContent=pool[rand(pool.length)];
  const x=clamp(parseFloat(el.style.left||0)+parseFloat(el.style.width||80)/2,86,Math.max(86,field.clientWidth-86));
  const y=Math.max(62,parseFloat(el.style.top||80)+8);
  d.style.left=x+'px';d.style.top=y+'px';field.appendChild(d);
  B.selTalkAt=now;setTimeout(()=>d.remove(),2850);
}

function monsterFullFx(f,label){
  const host=$('battleFullFx');if(!host||!f)return;
  host.className='';host.innerHTML='';host.appendChild(foeArt(f.art));
  const n=document.createElement('div');n.className='fxName';n.textContent=label||f.n+' 出手';host.appendChild(n);
  host.classList.add('motion-'+monsterMotionProfile(f.art));host.classList.toggle('boss',!!f.boss);
  void host.offsetWidth;host.classList.add('go');
  clearTimeout(monsterFullFx._t);monsterFullFx._t=setTimeout(()=>{host.className='';host.innerHTML='';},720);
}

function monsterAbilityTriggered(f){
  const t=f&&f.battleType,a=f&&f.act;
  return (t==='ward'&&a==='def')||(t==='hex'&&a==='curse')||(t==='fury'&&a==='buff')||
    (t==='swift'&&a==='atk')||(t==='leech'&&a==='atk')||(t==='breaker'&&a==='atk')||
    (t==='regen'&&a==='def')||(t==='venom'&&a==='atk')||(t==='chorus'&&a==='buff')||(t==='chaos'&&a==='atk');
}

function monsterAbilityFx(f){
  if(!monsterAbilityTriggered(f))return false;
  const field=$('field'),el=document.getElementById(f.uid),meta=MONSTER_SKILL_VISUAL[f.battleType];
  if(!field||!el||!meta)return false;
  /* 怪群連續行動時保留最新三個動畫，避免 DOM 粒子堆積。 */
  const old=[...field.querySelectorAll('.monsterSkillFx')];while(old.length>=3)old.shift().remove();
  const fw=field.clientWidth,fh=field.clientHeight,sx=parseFloat(el.style.left||fw*.5)+parseFloat(el.style.width||80)/2,
    sy=parseFloat(el.style.top||fh*.35)+parseFloat(el.style.width||80)*.42,tx=fw*.5,ty=fh*.82;
  const group=monsterSkillGroupMeta(monsterBattleSkillGroup(f.battleType));
  const root=document.createElement('div');root.className='monsterSkillFx ms-'+f.battleType;
  root.classList.add('motion-'+monsterMotionProfile(f.art),'mtier-'+Math.min(7,monsterTier(f.art)));
  root.style.setProperty('--mc',group.color);root.style.setProperty('--sx',sx+'px');root.style.setProperty('--sy',sy+'px');
  root.style.setProperty('--tx',tx+'px');root.style.setProperty('--ty',ty+'px');
  const title=document.createElement('div');title.className='ms-title';title.style.color=group.color;title.textContent=group.ic+' '+group.n+'｜'+(f.abilityName||f.n+'技能');root.appendChild(title);
  const sigil=document.createElement('div');sigil.className='ms-sigil';sigil.textContent=meta.glyph;root.appendChild(sigil);
  const ground=document.createElement('div');ground.className='ms-ground';root.appendChild(ground);
  const beam=document.createElement('div');beam.className='ms-beam';root.appendChild(beam);
  const caster=foeArt(f.art);caster.className='ms-caster';root.appendChild(caster);
  for(let i=0;i<7;i++){
    const p=document.createElement('i');p.className='ms-particle';p.textContent=meta.bit;p.style.setProperty('--i',i);
    const ang=(i/7*Math.PI*2)+(Math.random()*.45),r=34+Math.random()*48;
    p.style.setProperty('--dx',Math.round(Math.cos(ang)*r)+'px');p.style.setProperty('--dy',Math.round(Math.sin(ang)*r)+'px');root.appendChild(p);
  }
  field.appendChild(root);setTimeout(()=>root.remove(),980);return true;
}

function companionAbilityFx(kind,index=0,triggerEffect=null,skillLabel=''){
  const field=$('field');if(!field)return false;
  const d=companionDef(kind),e=triggerEffect||(d.effects&&d.effects[0])||{type:d.type,value:d.value},group=monsterSkillGroupMeta(monsterSkillGroupByEffect(e.type));
  const visualType={heal:'regen',regen:'regen',block:'ward',mana:'chorus',draw:'chaos',power:'fury',strike:'breaker',burn:'venom',
    weaken:'hex',luck:'chaos',cleanse:'ward'}[e.type]||'chorus',meta=MONSTER_SKILL_VISUAL[visualType];
  const fw=field.clientWidth,fh=field.clientHeight,sx=fw*(.18+Math.min(4,index)*.16),sy=fh*.77,tx=fw*.5,ty=fh*.36;
  const root=document.createElement('div');root.className='monsterSkillFx ms-'+visualType;
  root.style.setProperty('--mc',group.color);root.style.setProperty('--sx',sx+'px');root.style.setProperty('--sy',sy+'px');
  root.style.setProperty('--tx',tx+'px');root.style.setProperty('--ty',ty+'px');
  const title=document.createElement('div');title.className='ms-title';title.style.color=group.color;title.textContent=group.ic+' '+group.n+'｜'+d.n+'・'+(skillLabel||d.skill);root.appendChild(title);
  const sigil=document.createElement('div');sigil.className='ms-sigil';sigil.textContent=meta.glyph;root.appendChild(sigil);
  const ground=document.createElement('div');ground.className='ms-ground';root.appendChild(ground);
  const beam=document.createElement('div');beam.className='ms-beam';root.appendChild(beam);
  for(let i=0;i<5;i++){
    const p=document.createElement('i');p.className='ms-particle';p.textContent=meta.bit;p.style.setProperty('--i',i);
    const ang=i/5*Math.PI*2,r=28+i*5;p.style.setProperty('--dx',Math.round(Math.cos(ang)*r)+'px');
    p.style.setProperty('--dy',Math.round(Math.sin(ang)*r)+'px');root.appendChild(p);
  }
  field.appendChild(root);setTimeout(()=>root.remove(),980);return true;
}

function advanceRows(){
  if(rowOf(0).length||!rowOf(1).length)return false;
  for(const f of rowOf(1)){
    f.row=0;f.intent=rollIntent(f);
    const el=document.getElementById(f.uid);
    if(el){el.classList.remove('advance');void el.offsetWidth;el.classList.add('advance');}
  }
  toast('後排前進！',1300);
  return true;
}

function foeScale(n,idx){
  const base=clamp(1.18-(n-1)*.078,.54,1.18);
  const off=Math.abs(idx-(n-1)/2);
  return base*(1-off*.05);
}

function layoutFoes(){
  const field=$('field'),W=field.clientWidth,H=field.clientHeight;
  for(const row of [0,1]){
    const line=B.foes.filter(f=>!f.dead&&f.row===row);
    const n=line.length;
    if(!n)continue;
    const gap=Math.min(row?96:112,(W-40)/Math.max(1,n));
    line.forEach((f,i)=>{
      const el=document.getElementById(f.uid);
      if(!el)return;
      const sc=foeScale(n,i)*(f.boss?1.55:f.teacherBoss?1.45:1)*(row?.74:1);   // 教師與頭目保留大型輪廓
      const w=Math.round(92*sc);
      const off=i-(n-1)/2;
      const x=W/2+off*gap-w/2+(row?gap*.32:0);              // 後排錯開，不被前排完全擋住
      const depth=Math.abs(off);
      const y=(row?H*0.24:H*0.46)-w*0.5+depth*(row?4:7);
      el.style.width=w+'px';
    el.style.setProperty('--r',Math.round(w*0.55)+'px');
      el.style.left=Math.round(x)+'px';
      el.style.top=Math.round(y)+'px';
      el.style.zIndex=String((row?6:20)-Math.round(depth*2));
    });
  }
  const cur=document.querySelector('.cursor');
  if(cur)cur.remove();
  const t=B.foes[B.target];
  if(t&&!t.dead){
    const el=document.getElementById(t.uid);
    if(el){
      const c=document.createElement('div');
      c.className='cursor';c.textContent='▼';
      c.style.left=(parseFloat(el.style.left)+parseFloat(el.style.width)/2-7)+'px';
      c.style.top=(parseFloat(el.style.top)-19)+'px';
      $('field').appendChild(c);
    }
  }
}

function drawFieldBg(){
  const c=$('fieldBg'),f=$('field');
  const W=c.width=f.clientWidth,H=c.height=f.clientHeight;
  const g=c.getContext('2d');
  // 每次進戰鬥都重新套用所在區域／樓層的主題；戰鬥就發生在玩家站的位置。
  // 這也讓洞窟、雲海、空中花園與王座廳不會退回同一張固定黑色背景。
  applyTheme(S.zone||0,fl);
  c.dataset.zone=String(S.zone||0);
  c.dataset.floor=String(fl||0);
  const fog=CUR_TH&&CUR_TH.fog||[22,16,42];
  const fallback=g.createLinearGradient(0,0,0,H);
  fallback.addColorStop(0,`rgb(${fog[0]},${fog[1]},${fog[2]})`);
  fallback.addColorStop(1,'rgb(8,6,18)');
  g.fillStyle=fallback;g.fillRect(0,0,W,H);
  // 背景沿用當層環境，但不把即時巡邏怪物烙進背景，避免戰場上同時出現兩批敵人。
  drawWeapon.skip=true;
  render.staticBattleBackdrop=true;
  try{ render(); }catch(_){}
  finally{render.staticBattleBackdrop=false;}
  drawWeapon.skip=false;
  g.imageSmoothingEnabled=false;
  const sc=Math.max(W/RW,H/RH),dw=RW*sc,dh=RH*sc;   // cover 填滿不變形
  g.drawImage(cvs,(W-dw)/2,(H-dh)/2,dw,dh);
  // 輕微壓暗＋暗角，讓怪物與手牌浮在場景上
  g.fillStyle='rgba(10,6,20,.28)';g.fillRect(0,0,W,H);
  const v=g.createRadialGradient(W/2,H*.5,H*.25,W/2,H*.5,H*.9);
  v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');
  g.fillStyle=v;g.fillRect(0,0,W,H);
}

function startReinforceClock(){ renderReinf(); }

function battleWorldTick(){
  if(!B||B.over||B.pvp)return;
  let arrive=[];
  for(let i=0;i<TICKS_PER_ROUND;i++){
    const a=worldTick();
    for(const m of a) if(!arrive.includes(m)) arrive.push(m);
  }
  for(const m of arrive){
    if(m.inBattle||B.foes.filter(f=>!f.dead).length>=MAX_FOES)continue;
    m.inBattle=1;B.waves++;
    deploySquad(m,true);
    const bf=B.foes.find(f=>f.squad===m.id&&f.boss);
    if(bf){ bossCutscene(bf,()=>{renderAll();}); }
    else toast('援軍隊伍抵達：'+m.n+' ×'+m.roster.length+'！',1600);
  }
  renderFoes();renderReinf();
}

function tickBar(){}

function renderReinf(){
  const bar=$('reinfBar');
  if(!bar)return;
  if(B&&B.pvp){ bar.classList.remove('hide'); return; }   // 對戰模式由別處控制
  const inc=mobs.filter(m=>m.alive&&!m.inBattle&&m.state==='alert')
    .map(m=>({m,d:bfsDist(m.x,m.y,P.x,P.y)}))
    .filter(o=>o.d<=6)                       // 只顯示真的在接近的
    .sort((a,b)=>a.d-b.d).slice(0,4);
  if(!inc.length){ bar.classList.add('hide'); return; }    // 沒有援軍就整條隱藏
  bar.classList.remove('hide');
  $('rTick').textContent='援軍接近';
  $('rList').innerHTML=inc.map(({m,d})=>{
    const turns=Math.max(1,Math.ceil(d*(m.speed||1)/TICKS_PER_ROUND));
    return `<span class="rItem${turns<=2?' near':''}">${m.n}
      <b>${turns}</b> 回合後加入</span>`;
  }).join('');
}

function renderFoes(){
  const field=$('field');
  // 移除已消失的
  for(const el of [...field.querySelectorAll('.foe')]){
    if(!B.foes.some(f=>f.uid===el.id&&!f.dead)) { el.classList.add('dying'); setTimeout(()=>el.remove(),450); }
  }
  for(const f of B.foes){
    if(f.dead)continue;
    let el=document.getElementById(f.uid);
    if(!el){
      el=document.createElement('div');
      el.className='foe'+(f.fresh?' arrive':'');
      if(f.fresh&&f.delay) el.style.animationDelay=f.delay+'ms';
      el.id=f.uid;
      const sprite=foeArt(f.art);sprite.className='monsterSprite';el.appendChild(sprite);
      const info=document.createElement('div');
      info.className='inf';
      el.appendChild(info);
      const tag=document.createElement('div');
      tag.className='rowTag';
      el.appendChild(tag);
      el.onclick=()=>{
        if(f.row===1&&rowOf(0).length){toast('前排未清空，無法指定後排',1200);return;}
        B.target=B.foes.indexOf(f);renderFoes();
      };
      field.appendChild(el);
      f.fresh=false;
    }
    el.classList.toggle('mathTeacherFoe',!!f.teacherBoss);
    const motion=monsterMotionProfile(f.art);
    ['hover','skitter','coil','stomp','bounce','pounce'].forEach(v=>el.classList.toggle('motion-'+v,v===motion));
    const locked=f.row===1&&rowOf(0).length>0;
    el.classList.toggle('back',f.row===1);
    el.classList.toggle('front',f.row===0);
    el.classList.toggle('locked',locked);
    el.classList.toggle('sel',B.foes[B.target]===f);
    // 點敵人即可指定攻擊目標 —— 前排未清空時仍受陣型限制
    el.onclick=()=>{
      if(!B||B.over||f.dead)return;
      const idx=B.foes.indexOf(f);
      if(idx<0)return;
      const frontAlive=B.foes.some(x=>!x.dead&&x.row===0);
      if(f.row===1&&frontAlive){ toast('前排還沒清空，打不到後排',1400); return; }
      B.target=idx; renderFoes();
      toast('目標：'+f.n,900);
    };
    // Boss：環繞身旁的眼睛，依出牌數依序睜開
    if(f.boss){
      let ring=el.querySelector('.eyering');
      if(!ring||ring.dataset.n!=String(f.eyes||6)){
        if(ring) ring.remove();
        ring=document.createElement('div');
        ring.className='eyering';
        ring.dataset.n=String(f.eyes||6);
        const n=f.eyes||6;
        for(let i=0;i<n;i++){
          const a=(i/n)*360-90;
          const e=document.createElement('span');
          e.className='beye';
          e.style.transform=`rotate(${a}deg) translateY(calc(var(--r) * -1)) rotate(${-a}deg)`;
          e.innerHTML='<i></i>';
          ring.appendChild(e);
        }
        el.appendChild(ring);
      }
      const eyes=ring.querySelectorAll('.beye');
      eyes.forEach((e,i)=>{
        const on=i<(f.open||0);
        if(on&&!e.classList.contains('on')){ e.classList.add('on','just'); setTimeout(()=>e.classList.remove('just'),400); }
        if(!on) e.classList.remove('on','just');
      });
      ring.classList.toggle('full',(f.open||0)>=(f.eyes||6));
    }
    el.querySelector('.rowTag').textContent=f.row?'後':'前';
    // 卡面只留最關鍵資訊：血量與下一步意圖，其餘點 ⓘ 才展開
    el.querySelector('.inf').innerHTML=
      `<div class="fbar"><i style="width:${Math.max(0,f.hp/f.max*100)}%"></i>
        <div class="fnum">${f.hp}/${f.max}</div></div>
       <div class="fint ${f.act||'atk'}">${f.frozen?'❄ 凍結中':INTENT_TXT(f)}${f.burn?' 🔥':''}${f.shield?' 🛡'+f.shield:''}</div>
       <div class="finfo">ⓘ 詳情</div>`;
    const chip=el.querySelector('.finfo');
    if(chip) chip.onclick=ev=>{ ev.stopPropagation(); foeDetail(f); };
  }
  layoutFoes();
}

function foeDetail(f){
  const traitTxt=B&&B.trait==='prime'?'⚡ 場地特性「質數剋星」：出牌數字是質數時傷害加成'
    :B&&B.trait==='abs'?'⚡ 場地特性「絕對值」：負數傷害以絕對值計算':'';
  overlay(`<div class="kicker">ENEMY INFO</div><h1>${f.n}${f.boss?'　<span style="color:#ff8a3b">頭目</span>':''}</h1>
    <div class="rank">HP ${f.hp}/${f.max}${f.shield?'　🛡 護盾 '+f.shield:''}</div>
    <div class="mathbox">
      ${f.expr?`<div class="ml">生命算式：<b>${f.expr}</b>（解出來就知道牠的血量）</div>`:''}
      <div class="ml">下一步：<b>${INTENT_TXT(f)}</b>${f.act==='atk'?`　—— 將造成 <b>${f.intent}</b> 點傷害`
        :f.act==='def'?'　—— 將獲得護盾':f.act==='buff'?'　—— 將強化我方攻擊':f.act==='curse'?'　—— 將施放詛咒':''}</div>
      ${f.burn?'<div class="ml">狀態：🔥 燃燒中（每回合扣血）</div>':''}
      ${f.frozen?'<div class="ml">狀態：❄ 凍結中（下一次敵方行動跳過）</div>':''}
      ${f.boss?`<div class="ml">👁 蓄力之眼 <b>${f.open||0}/${f.eyes||6}</b> —— 每出一張牌就睜眼；<b>達 5 連會破勢、歸零集氣</b></div><div class="ml">🛡 BOSS 鎧甲：5 連前只承受 35% 傷害；5 連後破甲增傷</div>`:''}
      ${f.abilityName?(()=>{const g=monsterSkillGroupMeta(monsterBattleSkillGroup(f.battleType));return `<div class="ml">${g.ic} <b style="color:${g.color}">${g.n}</b>｜<b>${hesc(f.abilityName)}</b><br>${hesc(MONSTER_BATTLE_DESC[f.battleType]||'會依物種特性改變戰鬥行動。')}</div>`;})():''}
      ${traitTxt?`<div class="ml">${traitTxt}</div>`:''}
      <div class="ml">站位：${f.row?'後排（前排清空才打得到）':'前排'}</div>
    </div>
    <button class="go" id="ok">關閉</button>`);
}

function targetFoe(){
  let t=B.foes[B.target];
  const front=rowOf(0);
  if(front.length){
    if(!t||t.dead||t.row===1) { t=front[0]; B.target=B.foes.indexOf(t); }
    return t;
  }
  if(!t||t.dead){
    const idx=B.foes.findIndex(f=>!f.dead);
    B.target=idx;t=B.foes[idx];
  }
  return t;
}

function splitDamage(total,chain,hits){
  if(total<=0) return [total];
  let n = 1 + (hits-1) + Math.floor((chain||1)/3);
  n = Math.max(1, Math.min(8, n));
  if(total<n) n=Math.max(1,total);        // 傷害太小就不要硬拆
  const base=Math.floor(total/n), rem=total-base*n;
  const out=[];
  for(let i=0;i<n;i++) out.push(base+(i<rem?1:0));
  return out;
}

function popDmg(f,v,crit,prefix){
  const el=document.getElementById(f.uid);if(!el)return;
  const d=document.createElement('div');
  d.className='dmgNum fountain'+(crit?' crit':'');
  d.textContent=(prefix||'')+v;
  // 噴泉：往上噴出後受重力落下，角度與力道隨機
  const ang=(-120+Math.random()*60)*Math.PI/180;
  const pow=40+Math.random()*45;
  d.style.setProperty('--vx',(Math.cos(ang)*pow)+'px');
  d.style.setProperty('--vy',(Math.sin(ang)*pow)+'px');
  d.style.setProperty('--fall',(50+Math.random()*40)+'px');
  d.style.left=(parseFloat(el.style.left)+parseFloat(el.style.width)/2-14)+'px';
  d.style.top=(parseFloat(el.style.top)+10)+'px';
  $('field').appendChild(d);
  setTimeout(()=>d.remove(),1000);
  el.classList.remove('hurt');void el.offsetWidth;el.classList.add('hurt');
}

function battleHandLimit(){return Math.min(MAX_BATTLE_HAND_LIMIT,BASE_BATTLE_HAND_LIMIT+Math.max(0,B&&Number(B.capBonus)||0));}

function addBattleHandLimit(n){
  if(!B)return 0;
  const before=battleHandLimit();
  B.capBonus=Math.min(MAX_BATTLE_HAND_LIMIT-BASE_BATTLE_HAND_LIMIT,Math.max(0,(B.capBonus||0)+(Number(n)||0)));
  return battleHandLimit()-before;
}

function clearBattleTemporaryState(){
  if(!B)return;
  B.capBonus=0;B.manaBonus=0;B.block=0;B.nextMul=1;B.dmgPenalty=0;B.supBoost=0;
  B.followerPower=0;B.followerWeaken=0;B.followerMana=0;B.followerRegen=0;B.followerTotals=null;B.followersApplied=false;
  B.followerTriggerCount=null;B.followerSpecialUsed=null;B.followerEventTurn=null;B.turnNo=0;
  B.hand=[];B.disc=[];B.draw=[];
}

function drawCards(n){
  const cap=battleHandLimit();
  for(let i=0;i<n;i++){
    if(B.hand.length>=cap){                    // 手牌已滿，抽不進來
      toast('手牌已滿 '+cap+' 張 — 先打幾張再抽',1300);
      break;
    }
    if(!B.draw.length){B.draw=shuffle(B.disc);B.disc=[];}
    if(!B.draw.length)return;
    B.hand.push(B.draw.pop());
  }
}

function newTurn(){
  B.turnNo=(B.turnNo||0)+1;B.step=seqStart();B.mana=S.mana+(B.manaBonus||0)+(B.followerMana||0);B.chain=0;B.ults={};B.played=0;B.lastCosts=[];B.supBoost=0;B.dmgPenalty=0;B.nextMul=1;B.block=0;B.hand=[];B.statSample=false;B.rareSpark=false;
  let n=5;
  if(B.firstTurn){
    B.firstTurn=false;
  }
  drawCards(n);
  if(B.followerRegen&&S.hp<S.maxhp){
    const got=Math.min(B.followerRegen,S.maxhp-S.hp);S.hp+=got;
    if(got)toast('🌿 怪物夥伴回春：HP +'+got,1000);
  }
  if(B.coinPending){                      // 後手第一回合發一張補償法力卡
    B.coinPending=false;
    if(B.hand.length>=battleHandLimit())B.draw.push(B.hand.pop());
    B.hand.push({id:'coin',gem:null});
    toast('後手補償：一張手牌替換為「補償法力」（總數仍受上限限制）',2400);
  }
  if(B.followersApplied){triggerFollowerSkills('assist',{});triggerFollowerSkills('recovery',{status:'turnLowHp'});}
  renderAll();
}

function enemyStrike(){
  if(!B||B.over)return;
  enemyPhase(0,()=>{
    B.busy=false;
    B.foes.forEach(f=>f.intent=rollIntent(f));
    renderAll();
  });
}

function nextStep(cost){ return cost+1; }

function playCard(i,afterLaunch=false){
  if(!B||B.over||B.busy||(!afterLaunch&&B.cardResolving)){
    if(afterLaunch&&B)B.cardResolving=false;
    return;
  }
  const o=B.hand[i];
  if(!o){if(afterLaunch)B.cardResolving=false;return;}
  if(DUEL&&DUEL.waiting){ if(afterLaunch)B.cardResolving=false;toast('現在是對方的回合',1200); return; }
  if(!legal(o)){if(afterLaunch)B.cardResolving=false;return;}
  try{ _playCard(i); }
  catch(err){ console.error("playCard 發生錯誤",err); toast("出牌失敗，請回報",1400); }
  finally{B.cardResolving=false;}
}

function _playCard(i){
  if(B.over)return;
  const o=B.hand[i],c=effCard(o);
  if(!legal(o))return;
  const aliveBefore=B.foes.filter(f=>!f.dead).map(f=>f.uid);
  const cont=chainable(o);
  B.played=(B.played||0)+1;
  B.lastCosts=(B.lastCosts||[]).concat(c.c);
  B.hand.splice(i,1);
  if(cont){ B.chain++; B.cur.push(c.c); }
  else {
    if(B.cur.length>B.bestArr.length) B.bestArr=B.cur.slice();
    if(B.cur.length) B.chains.push(B.cur.length);
    B.chain=1; B.cur=[c.c]; breakCombo();
  }
  if(B.chain===3)triggerFollowerSkills('attack',{chain:B.chain});
  const luckMul=c.dmg&&B.luckHits>0?1.35:1;
  const mul=chainMul()*B.nextMul*S.dmgMul*jobDmgMul(c)*(1-(B.dmgPenalty||0))*luckMul*(1+(B.followerPower||0));
  const big=B.nextMul>1||luckMul>1;
  if(luckMul>1){B.luckHits--;toast('🍀 幸運一擊 ×1.35（剩 '+B.luckHits+' 張）',1200);}
  B.nextMul=1;
  // ── 數學家專屬效果 ──
  if(c.sp){
    const alive=B.foes.filter(f=>!f.dead);
    let tgt=targetFoe();
    if(c.sp==='desc'){ tgt=B.foes.find(f=>!f.dead&&f.row===1)||tgt; }
    if(c.sp==='gauss'){
      const n=B.played||1, d=Math.round(5*n*(n+1)/2*mul);
      if(tgt){tgt.hp-=d;popDmg(tgt,d,true,'Σ ');if(tgt.hp<=0){tgt.hp=0;tgt.dead=true;}}
      toast('高斯求和：n='+n+' → '+n+'×'+(n+1)+'/2 = '+(n*(n+1)/2),1800);
    }
    if(c.sp==='pytha'){
      const L=B.lastCosts||[], a=L[L.length-1]||0, b=L[L.length-2]||0;
      const d=Math.round(6*(a*a+b*b)*mul)||6;
      if(tgt){tgt.hp-=d;popDmg(tgt,d,true,'△ ');if(tgt.hp<=0){tgt.hp=0;tgt.dead=true;}}
      toast('畢氏定理：'+a+'²+'+b+'² = '+(a*a+b*b),1800);
    }
    if(c.sp==='euclid'&&tgt){
      let d=Math.round(20*mul);
      const div = tgt.hp%3===0;
      if(div) d*=2;
      tgt.hp-=d;popDmg(tgt,d,div,div?'÷3 ':'');
      if(div)toast('目標 HP 為 3 的倍數 — 傷害加倍！',1600);
      if(tgt.hp<=0){tgt.hp=0;tgt.dead=true;}
    }
    if(c.sp==='fermat'){
      let d=Math.round(30*mul*(B.chain>=3?2:1));
      for(const t of alive){ t.hp-=d;popDmg(t,d,B.chain>=3,'ⁿ ');
        if(t.hp<=0){t.hp=0;t.dead=true;} }
    }
    if(c.sp==='pascal'){ const n=Math.min(3,Math.max(1,B.chain)); drawCards(n);
      toast('帕斯卡三角：抽 '+n+' 張',1400); }
    if(c.sp==='archi'&&tgt){
      const sh=tgt.shield||0; tgt.shield=0;
      const d=Math.round((sh+12)*mul);
      tgt.hp-=d;popDmg(tgt,d,sh>0,'⚖ ');
      if(sh)toast('槓桿原理：'+sh+' 點護盾反轉為傷害',1600);
      if(tgt.hp<=0){tgt.hp=0;tgt.dead=true;}
    }
  }
  const fxHits=[];
  if(c.dmg){
    const alive=B.foes.filter(f=>!f.dead);
    const tg=c.all?alive:[targetFoe()].filter(Boolean);
    let tot=0;
    for(const t of tg){
      const rowCut=t.row===1?.6:1;          // 後排距離遠，全體傷害衰減
      // 質數剋星：只有質數費用的卡打得痛
      const primeCut = B.trait==='prime' ? (isPrime(c.c)?1.5:0.6) : 1;
      // BOSS 鎧甲：五連前大幅減傷；達五連後破甲，鼓勵用完整連段取勝。
      const bossChainCut=t.boss?(B.chain>=5?1.35:.35):1;
      const areaCut=c.all?.68:1;              // 全體卡以範圍換取威力，避免全面勝過單體卡
      // 分數護盾：擋下固定比例
      const fracCut = 1;
      let sub=0;
      for(let h=0;h<(c.hits||1);h++){
        let d=Math.max(1,Math.round(c.dmg*mul*rowCut*primeCut*fracCut*bossChainCut*areaCut));
        if(t.shield){ const ab=Math.min(t.shield,d); t.shield-=ab; d-=ab; }
        t.hp-=d;tot+=d;sub+=d;
        if(t.hp<=0){t.hp=0;t.dead=true;}
      }
      fxHits.push({uid:t.uid,d:sub,crit:big||B.chain>=8,pre:(c.hits>1)?(c.hits+'× '):''});
    }
    if(tot){ creditDamage(tot); if(DUEL&&!DUEL.done) DUEL.myDmg+=tot; }
    if(c.drain){const dr=Math.min(Math.round(tot*.12),S.maxhp-S.hp);S.hp+=dr;
      if(dr)popPlayer('+'+dr+' ♥','heal',120);}
  }
  /* 護盾只吃小幅連擊加成，不吃角色攻擊倍率或傷害詞條，避免高攻角色同時變成無敵坦克。 */
  const shieldChainMul=Math.min(1.35,1+Math.max(0,B.chain-1)*.05);
  if(c.block)gainPlayerBlock(Math.round(c.block*shieldChainMul),0);
  if(c.heal){const hl=Math.min(c.heal,S.maxhp-S.hp);S.hp+=hl;if(hl)popPlayer('+'+hl+' ♥','heal',80);}
  if(c.burn){const t=targetFoe();if(t)t.burn+=c.burn;}
  if(c.manaUp){                       // 僅限本場戰鬥
    B.manaBonus=(B.manaBonus||0)+c.manaUp;
    B.mana+=c.manaUp;
    toast('本場法力上限 +'+c.manaUp+'（目前 '+(S.mana+B.manaBonus)+'）',1800);
  }
  if(c.capUp){const up=addBattleHandLimit(c.capUp);toast(up?'本場手牌上限 +'+up+'（最高 '+MAX_BATTLE_HAND_LIMIT+'）':'手牌上限已達 '+MAX_BATTLE_HAND_LIMIT,1400);}
  if(c.mul)B.nextMul=c.mul;
  const rolledCost=jobManaCost(c),paidCost=B.chain>3&&cont&&!c.wild&&!c.neg?Math.min(1,rolledCost):rolledCost;
  B.mana-=paidCost;
  // 通用卡先支付牌面費用再回魔；收緊儲存上限避免無限累積。
  const manaCap=S.mana+3+(B.manaBonus||0);
  if(B.mana>manaCap) B.mana=manaCap;
  if(c.manaGain){
    const mg=c.manaGain+(c.wild?metaVal('wild'):0),before=B.mana;B.mana=Math.min(manaCap,B.mana+mg);
    const actual=B.mana-before;toast((c.wild?'通用卡回魔：+':'補償法力：+')+actual+' 點'+(actual<mg?'（已達儲存上限）':''),1300);
  }
  // 品質能力有次數限制，讓高稀有卡有特色但不會形成無限回魔。
  if(c.r==='R'&&!B.rareSpark){
    B.rareSpark=true;
    const before=B.mana;B.mana=Math.min(manaCap,B.mana+1);
    gainPlayerBlock(3,0);
    toast('🔷 稀有能力「精準文具」：返還 '+(B.mana-before)+' 法力、護盾 +3',1700);
  }
  if(c.r==='L'&&!B.legendSpark){
    B.legendSpark=true;
    const before=B.mana;B.mana=Math.min(manaCap,B.mana+2);drawCards(1);
    toast('🌟 傳說能力「靈感突破」：返還 '+(B.mana-before)+' 法力、抽 1 張',1900);
    cineCard(o,Math.max(5,B.chain));
  }
  // 通用卡與負費卡：不改變序列進度（但仍增加連擊數），一般卡才推進序列。
  B.step = (c.wild||c.neg) ? B.step : nextStep(c.c);
  // 負費卡的代價
  if(c.neg){
    if(c.selfDmg){ S.hp=Math.max(1,S.hp-c.selfDmg); popPlayer('-'+c.selfDmg,'hurt',80); flash(); }
    if(c.addCurse){ B.disc.push({id:'curse',gem:null}); toast('一張詛咒混入牌堆',1300); }
    if(c.foeShield){ const t=targetFoe(); if(t){ t.shield=(t.shield||0)+c.foeShield;
      popDmg(t,c.foeShield,false,'🛡 +'); } }
    if(c.dmgDown){ B.dmgPenalty=c.dmgDown; toast('本回合傷害 −'+Math.round(c.dmgDown*100)+'%',1500); }
    if(c.addCurse||c.dmgDown)triggerFollowerSkills('assist',{status:c.addCurse?'curse':'weaken'});
    if(c.selfDmg&&S.hp/S.maxhp<.70)triggerFollowerSkills('recovery',{status:'lowHp'});
    toast('回收 '+Math.abs(c.c)+' 點法力（序列重置回 0）',1400);
  }
  // Boss 反制延後到 8 連以後，先讓學生有公平機會完成五連破勢。
  for(const f of B.foes){
    if(f.dead||!f.boss)continue;
    if(B.chain>=8 && (B.chain-8)%3===0 && B.hand.length>0){
      const idx=rand(B.hand.length);
      const lost=B.hand.splice(idx,1)[0];
      if(lost&&!CARDS[lost.id].CURSE) B.disc.push(lost);
      shakeQuake(lost?CARDS[lost.id].n:'');
      toast('👁 '+f.n+' 震動大地 — 「'+(lost?CARDS[lost.id].n:'手牌')+'」被震落！',2000);
    }
  }
  // Boss 蓄力：每張牌睜眼；每達 5、10、15…連先破勢，再判斷是否全開。
  for(const f of B.foes){
    if(f.dead||!f.boss)continue;
    f.open=(f.open||0)+1;
    if(B.chain>=5&&B.chain%5===0)bossBreakCharge(f);
    else if(f.open>=(f.eyes||6)){ f.open=0; setTimeout(()=>bossEyeBlast(f),Math.max(260,120)); }
  }
  jobOnPlay(c,cont);
  if(c.back)B.hand.push(o);else if(!c.CURSE&&!c.TEMP)B.disc.push(o);
  if(c.draw)drawCards(c.draw);
  // 最終教師的推理護盾不會被一般傷害擊破；必須依序完成五張傳說卡。
  const teacherFoe=(B.teacherFinal||B.teacherPrologue)&&B.foes.find(f=>f.teacherBoss);
  if(teacherFoe&&teacherFoe.hp<=0&&!B.teacherFinalFinishing){teacherFoe.hp=1;teacherFoe.dead=false;}
  const teacherFinisher=teacherFinalSequenceOnCard(o);
  // 集中偵測擊殺 → 子彈時間
  const killed=aliveBefore.filter(u=>{const f=B.foes.find(x=>x.uid===u);return f&&f.dead;});
  const tFoe=targetFoe();
  queueCardAnim(o, tFoe?tFoe.uid:null, fxHits, B.chain);
  if(killed.length) setTimeout(()=>bulletTime(killed[0]),150);
  B.best=Math.max(B.best,B.chain);
  creditChain(B.chain);
  ultimateCheck();
  if(advanceRows()) setTimeout(renderAll,60);
  popCombo();renderAll();
  if(teacherFinisher)return;
  if(B.foes.every(f=>f.dead)){queueBattleVictory();return;}
  if(!B.hand.some(legal)){
    $('endBtn').classList.add('urge');
    // 沒有任何能打的牌 → 自動結束回合，不必讓學生多按一次
    setTimeout(()=>{
      if(B&&!B.over&&!B.busy&&!B.hand.some(legal)&&!(DUEL&&DUEL.waiting)){
        toast('無牌可出 — 自動結束回合',1400);
        endTurn();
      }
    },700);
  }
}

function endTurn(){
  if(B.over||B.busy)return;
  $('endBtn').classList.remove('urge');
  if(B.pvp&&B.pvp.practice){                 // 練習賽：AI 立刻回擊
    if(B.foes[0].hp<=0){ practiceEnd(true); return; }
    B.disc.push(...B.hand); B.hand=[];
    setTimeout(aiTakeTurn,450); return;
  }
  if(DUEL&&!DUEL.done){
    if(DUEL.waiting){ toast('等待對方出牌',1200); return; }
    B.disc.push(...B.hand); B.hand=[];
    duelSendTurn(); return;
  }
  // 灼燒結算
  for(const f of B.foes){
    if(f.dead||!f.burn)continue;
    const b=f.burn;
    f.hp-=b;f.burn=Math.max(0,f.burn-2);
    popDmg(f,b,false,'🔥');
    if(f.hp<=0){f.hp=0;f.dead=true;}
  }
  if(B.foes.every(f=>f.dead)){renderAll();queueBattleVictory();return;}
  advanceRows();
  if(B.skipEnemy>0){                       // 先制：敵人這回合來不及反應
    B.skipEnemy--;
    toast('先制中 — 敵人無法行動',1200);
    finishEnemyPhase();
  }else{
    enemyPhase(0,finishEnemyPhase);
  }
}

function enemyPhase(i,done){
  if(!B||B.over)return;
  const alive=B.foes.filter(f=>!f.dead);
  if(i>=alive.length){done&&done();return;}
  B.busy=true;
  const f=alive[i];
  if(f.frozen>0){
    f.frozen--;popDmg(f,0,false,'❄ 凍結');toast('❄️ '+f.n+' 被凍結，無法行動',1100);
    setTimeout(()=>enemyPhase(i+1,done),360);return;
  }
  if(f.boss){ setTimeout(()=>enemyPhase(i+1,done),60); return; }   // Boss 只靠眼睛攻擊
  const el=document.getElementById(f.uid);
  if(el){el.classList.add('acting');el.classList.remove('attack');
         void el.offsetWidth;el.classList.add('attack');}
  monsterSay(f,f.hp/f.max<=.3?'low':(f.act||'atk'));
  const usedSpeciesFx=monsterAbilityFx(f);
  if(f.teacherBoss)teacherTextbookAttackFx(f,'奧義・課本演算連擊');
  else if(!usedSpeciesFx&&(f.act==='atk'||f.act==='curse'))monsterFullFx(f,f.act==='curse'?'情緒迷霧':'勇敢出手');
  if(f.act==='def'){                       // 上盾：自己獲得護盾
    f.shield=(f.shield||0)+f.intent;
    let regen=0;if(f.battleType==='regen'&&f.hp<f.max){regen=Math.min(6,f.max-f.hp);f.hp+=regen;}
    setTimeout(()=>{ popDmg(f,f.intent,false,'🛡 +'); refreshStatus();
      if(regen)toast('🌿 '+f.n+' 再生 HP +'+regen,1000);
      setTimeout(()=>enemyPhase(i+1,done),320); },170);
    if(el)setTimeout(()=>el.classList.remove('acting'),400);
    return;
  }
  if(f.act==='buff'){                      // 強化：永久提升攻擊力
    if(f.battleType==='chorus')B.foes.filter(x=>!x.dead).forEach(x=>x.atk+=1);else f.atk+=3;
    triggerFollowerSkills('assist',{status:'enemyBuff'});
    setTimeout(()=>{ popDmg(f,3,true,'▲ ATK+'); refreshStatus();
      setTimeout(()=>enemyPhase(i+1,done),320); },170);
    if(el)setTimeout(()=>el.classList.remove('acting'),400);
    return;
  }
  if(f.act==='curse'){                     // 詛咒：塞一張廢牌進棄牌堆
    B.disc.push({id:'curse',gem:null});
    triggerFollowerSkills('assist',{status:'curse'});
    setTimeout(()=>{ toast(f.n+' 施放詛咒 — 一張詛咒牌混入牌堆',1500);
      refreshStatus(); setTimeout(()=>enemyPhase(i+1,done),320); },170);
    if(el)setTimeout(()=>el.classList.remove('acting'),400);
    return;
  }
  /* 固定防禦最多抵銷單次攻擊 35%，避免高等角色把低中階怪物全部壓成 1 傷害。 */
  const armorCut=Math.min(Math.max(0,Number(S.armor)||0),Math.floor(f.intent*.35));
  let raw=Math.max(1,f.intent-armorCut), absorbed=0, toHp=0;
  if(B.trait==='abs'){                       // 絕對值：反彈 |攻擊 − 護盾|，無視護盾
    raw=Math.abs(f.intent-B.block);
    toHp=Math.max(0,raw);
  }else{
    // 小怪攻擊帶少量穿透，避免護盾把整場所有攻擊都顯示成 0。
    const pierceRate=f.battleType==='breaker'?.30:.15;
    const pierce=(!B.pvp&&!DUEL)?Math.min(raw,Math.max(1,Math.round(raw*pierceRate))):0;
    const shieldable=Math.max(0,raw-pierce);
    absorbed=Math.min(B.block,shieldable);
    toHp=pierce+(shieldable-absorbed);
  }
  setTimeout(()=>{
    if(!B||B.over)return;
    if(absorbed){B.block-=absorbed;popPlayer('🛡 -'+absorbed,'shield',0);}
    if(toHp){
      S.hp-=toHp;
      popPlayer('-'+toHp,'hurt',absorbed?150:0);flash();
      if(f.battleType==='leech'&&f.hp<f.max){const heal=Math.min(5,Math.ceil(toHp*.25),f.max-f.hp);f.hp+=heal;if(heal)popDmg(f,heal,false,'💚 +');}
      if(f.battleType==='venom'&&Math.random()<.30){B.disc.push({id:'curse',gem:null});toast('🟣 '+f.n+' 的干擾毒粉混入一張詛咒牌',1200);triggerFollowerSkills('assist',{status:'venom'});}
      if(S.hp>0){triggerFollowerSkills('defense',{damage:toHp});triggerFollowerSkills('recovery',{damage:toHp});}
    }
    if(el)el.classList.remove('acting');
    refreshStatus();
    if(S.hp<=0){S.hp=0;refreshStatus();B.busy=false;setTimeout(loseGame,650);return;}
    setTimeout(()=>enemyPhase(i+1,done),absorbed&&toHp?430:340);
  },f.teacherBoss?820:170);
}

function finishEnemyPhase(){
  B.busy=false;
  battleWorldTick();
  B.foes.forEach(f=>{
    if(B.pvp){ f.act='atk'; f.intent=simDeckTurn(f.deck,f.job,5+Math.floor((B.pvp.lv||1)/3),5).dmg; }
    else if(f.boss){ /* Boss 不走一般攻擊，只由蓄力眼管理行動。 */ }
    else if(f.teacherBoss){
      f.act='atk';
      f.intent=B.teacherPrologue?Math.max(28,Math.round(S.maxhp*.38)):Math.max(12,Math.round(S.maxhp*.12));
    }
    else rollIntent(f);
  });
  B.disc.push(...B.hand);
  newTurn();
}

function popPlayer(text,cls,delay){
  setTimeout(()=>{
    const w=$('pFx');if(!w)return;
    const d=document.createElement('div');
    d.className='pnum '+cls;d.textContent=text;
    d.style.left=(46+Math.random()*8)+'%';
    w.appendChild(d);
    setTimeout(()=>d.remove(),1050);
  },delay||0);
}

function refreshStatus(){
  const sb=$('shieldBadge');
  if(sb){ sb.classList.toggle('hide',!(B.block>0)); sb.innerHTML='🛡 <b>'+B.block+'</b>'; }
  renderFoes();
}

function renderAll(){
  renderFoes();renderReinf();
  $('comboBig').textContent=B.chain;
  const cmid=$('cmdMid');
  if(cmid) cmid.classList.toggle('hot',B.chain>=4);   // 連擊 5 起 HUD 發光

  // 血量瓶：對戰模式用對戰血量，一般戰鬥用角色血量
  const inDuel=(B.pvp||(DUEL&&!DUEL.done));
  const curHp=inDuel?(B.myHp||0):S.hp;
  const maxHp=inDuel?(B.myMax||1):S.maxhp;
  const hf=$('hFill'), hn=$('hNum');
  if(hf){
    const hp=Math.max(0,Math.min(100,curHp/Math.max(1,maxHp)*100));
    hf.style.height=hp+'%';
    hf.classList.toggle('low',hp<=30);
    // 血量下降時整瓶閃一下，確保看得見
    if(lastHpShown>curHp){
      hf.classList.remove('hit'); void hf.offsetWidth; hf.classList.add('hit');
    }
    lastHpShown=curHp;
  }
  if(hn) hn.textContent=curHp;
  // 魔力瓶：液面高度＝目前法力比例
  const maxM=(S.mana||5)+((B.mana>S.mana)?(B.mana-S.mana):0);
  const pct=Math.max(0,Math.min(100,B.mana/Math.max(1,maxM)*100));
  const mf=$('mFill'), mn=$('mNum');
  if(mf){
    mf.style.height=pct+'%';
    mf.classList.toggle('over',B.mana>S.mana);   // 超出上限時變色
    mf.classList.toggle('low',B.mana<=1);
  }
  if(mn){ mn.textContent=B.mana; mn.classList.toggle('over',B.mana>S.mana); }
  const m=chainMul()*B.nextMul*S.dmgMul;
  $('multBig').innerHTML='×'+m.toFixed(2)+(B.nextMul>1?` <span class="nx">下張×${B.nextMul}</span>`:'');
  const ms=$('milestone2');
  const boss=B.foes.find(f=>!f.dead&&f.boss);
  const t=B.teacherFinal?'📚 五步推理 '+(B.teacherStep||0)+'/5　順序 0 → 1 → 2 → 3 → 4':boss&&B.chain<5?'👁 再接 '+(5-B.chain)+' 張可破除集氣':B.chain===5?'💥 五連破勢！':B.chain>=30?'★ 30 張 · 無限循環':B.chain>=20?'★ 20 張 · 神速':B.chain>=10?'★ 10 張 · 屠殺':'';
  ms.textContent=t;ms.classList.toggle('on',!!t);
  const sb=$('shieldBadge');
  if(sb){ sb.classList.toggle('hide',!(B.block>0)); sb.innerHTML='🛡 <b>'+B.block+'</b>'; }
  const fb=$('fleeBtn');
  if(fb) fb.classList.toggle('hide',!(B.pvp&&B.pvp.stake&&!B.pvp.noFlee&&!B.over));
  const pb=$('potBtn');
  if(pb){ pb.textContent='🧪 '+potCount(); pb.classList.toggle('has',potCount()>0); }
  const h=$('hand');h.innerHTML='';
  // 失效卡不渲染（並從手牌移除），避免出現灰色「未定義」卡片
  B.hand=B.hand.filter(o=>o&&CARDS[o.id]);
  B.hand.forEach((o,i)=>{
    const c=effCard(o),ok=legal(o),el=document.createElement('div');
    const cont=ok&&chainable(o);
    const shownCost=previewManaCost(o);
    const exact=cont&&!c.wild;
    const isNeg=!!c.neg;
    const isNew=!o._dealt; o._dealt=1;          // 新抽的牌從下方介面滑出
    el.className='card r'+(c.r||'C')+(c.FUSE?' fused fuse'+c.FUSE:'')+(c.EVO?' evolved':'')+(o.id==='coin'?' coinc':'')+(c.wild?' wild':'')
      +(c.CURSE?' curse':'')+(ok?' playable':' dead')+(cont?' exact':'')
      +(ok&&!cont?' resets':'')+(isNew?' dealIn':'');
    if(isNew) el.style.animationDelay=(i*45)+'ms';
    el.style.setProperty('--rc',RARITY[c.r||'C'].col);
    el.innerHTML=`<div class="cost${exact?' need':''}${c.neg?' neg':''}">${cardCostText(c)}</div>
      ${(c.r==='L'||c.r==='E')?`<div class="rgem" style="background:${RARITY[c.r].col}"></div>`:''}
      ${ok?`<div class="chip ${cont?'go':isNeg?'ng':'rs'}">${cont?(c.wild?'通用·耗'+c.c:(!c.neg?'接續·耗'+shownCost:'接續')):isNeg?'回魔':'重算'}</div>`:''}
      ${c.EVO?'<div class="badge">EVOLVED</div>':''}
      ${o.gem?`<div class="socket" style="border-color:${GEMS[o.gem].col}">${GEMS[o.gem].ic}</div>`:''}
      <div class="cicon">${cardIcon(c,o.id)}</div>
      <div class="cn">${c.n}</div><div class="ct">${c.t}</div>
      ${rarityAbilityText(c)?`<div class="rspec">${c.r==='L'?'🌟 靈感突破':'🔷 精準文具'}</div>`:''}
      ${o.gem?`<div class="gtx" style="color:${GEMS[o.gem].col}">${GEMS[o.gem].d.replace(/<\/?b>/g,'')}</div>`:''}`;
    let holdT=null, held=false;
    const startHold=()=>{ held=false; holdT=setTimeout(()=>{ held=true; cardDetail(o,'battle'); },420); };
    const endHold=()=>{ clearTimeout(holdT); };
    el.addEventListener('touchstart',startHold,{passive:true});
    el.addEventListener('touchend',endHold);
    el.addEventListener('mousedown',startHold);
    el.addEventListener('mouseup',endHold);
    el.addEventListener('mouseleave',endHold);
    el.onclick=()=>{ if(held){ held=false; return; }   // 長按 0.42 秒看詳情
      if(!B||B.cardResolving||B.busy||!legal(B.hand[i]))return;
      B.cardResolving=true;
      cardLaunch(el,()=>playCard(i,true)); };
    h.appendChild(el);
  });
  refreshBattleLootHud();
  emitUnclaimedKillLoot();
}

function ultimateCheck(){
  for(const u of ULTS){
    if(B.chain!==u.n || B.ults[u.n]) continue;
    B.ults[u.n]=1;
    if(u.n===4)drawCards(1);
    if(u.n===5)drawCards(2);
    ultBanner(u);
    shake();
  }
}

function ultBanner(u){
  const b=$('ultFx');
  b.innerHTML=`<div class="ut" style="color:${u.col}">${u.name}</div>
    <div class="ud">${u.n} 連擊 · ${u.d}</div>`;
  b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
}

function cineLayer(){
  let el=document.getElementById('cineFx');
  if(!el){
    el=document.createElement('div');
    el.id='cineFx';
    document.body.appendChild(el);
  }
  return el;
}

function teacherTextbookAttackFx(f,label){
  if(!f)return;
  const L=cineLayer(),w=document.createElement('div');w.className='cine teacherTextbookCine';
  w.innerHTML=`<div class="teacherCineVignette"></div><div class="teacherCineFormula">Σ　π　√　x²</div>
    <img src="./assets/npcs/math-teacher-v1.png" alt="數學教師">
    <div class="teacherCineBooks"><i>📘</i><i>📗</i><i>📙</i></div><div class="teacherCinePages">▱　▰　▱　▰　▱</div>
    <div class="teacherCineTitle">${hesc(label||'奧義・課本演算連擊')}</div>`;
  L.appendChild(w);cineClear(w,1050);
}

function teacherStudentFullPowerFx(f){
  const L=cineLayer(),w=document.createElement('div');w.className='cine teacherFullPowerCine';
  w.innerHTML=`<div class="teacherPowerRays"></div><div class="teacherPowerSequence">0　→　1　→　2　→　3　→　4</div>
    <div class="teacherPowerTitle">五步推理・全力一擊<em>LOGIC BREAK　99999!</em></div>`;
  L.appendChild(w);cineClear(w,1900);shake(4);
}

function cineClear(node,ms){ setTimeout(()=>node.remove(),ms); }

function cineCard(o,chain){
  const c=effCard(o), col=RARITY[c.r||'C'].col;
  const L=cineLayer();
  const w=document.createElement('div');
  w.className='cine cineCard';
  const tier = chain>=5?3 : chain>=4?2 : 1;
  w.innerHTML=`
    <div class="cineBands">
      <i style="background:linear-gradient(90deg,transparent,${col},transparent)"></i>
      <i style="background:linear-gradient(90deg,transparent,#fff,transparent)"></i>
      <i style="background:linear-gradient(90deg,transparent,${col},transparent)"></i>
    </div>
    <div class="cineBurst" style="border-color:${col}"></div>
    <div class="cineName" style="color:${col};text-shadow:0 0 24px ${col},0 4px 0 #000">
      ${cardIcon(c,o.id)} ${CARDS[o.id].n}
      <em>${chain} 連擊</em>
    </div>
    ${tier>=2?`<div class="cineRays">${Array.from({length:16},(_,i)=>
      `<b style="transform:rotate(${i*22.5}deg);background:linear-gradient(90deg,${col},transparent)"></b>`).join('')}</div>`:''}
    ${tier>=3?`<div class="cineFlash" style="background:${col}"></div>`:''}`;
  L.appendChild(w);
  cineClear(w, tier>=3?1100:tier>=2?900:700);
}

function cineBoss(name,dmg){
  const L=cineLayer();
  const w=document.createElement('div');
  w.className='cine cineBoss';
  w.innerHTML=`
    <div class="cbVignette"></div>
    <div class="cbEyes">${Array.from({length:9},(_,i)=>
      `<i style="animation-delay:${i*45}ms"></i>`).join('')}</div>
    <div class="cbBeams">${Array.from({length:12},(_,i)=>
      `<b style="transform:rotate(${i*30}deg)"></b>`).join('')}</div>
    <div class="cbTitle">
      <span class="cbName">${name}</span>
      <span class="cbSkill">毀 滅 光 束</span>
      <span class="cbDmg">−${dmg}</span>
    </div>
    <div class="cbShock"></div>
    <div class="cbFlash"></div>`;
  L.appendChild(w);
  cineClear(w,1400);
}

function shake(lv){
  const f=$('field');
  if(!f)return;
  const cls=['shk','shk2','shk3','shk4'][Math.max(0,Math.min(3,(lv||1)-1))];
  f.classList.remove('shk','shk2','shk3','shk4');
  void f.offsetWidth;
  f.classList.add(cls);
}

function shakeByChain(n){
  if(n>=7) shake(4);
  else if(n>=5) shake(3);
  else if(n>=4) shake(2);
  else if(n>=2) shake(1);
}

function shakeQuake(cardName){
  shake(4);
  const h=$('hand');
  if(h){ h.classList.remove('quake'); void h.offsetWidth; h.classList.add('quake'); }
  const field=$('field');
  if(field){
    for(let i=0;i<6;i++){
      const c=document.createElement('div');
      c.className='fx-crack';
      c.style.left=(10+Math.random()*80)+'%';
      c.style.top=(55+Math.random()*35)+'%';
      c.style.transform='rotate('+(Math.random()*60-30)+'deg)';
      c.style.animationDelay=(i*40)+'ms';
      field.appendChild(c);
      setTimeout(()=>c.remove(),700);
    }
  }
}

function bossBreakCharge(f){
  if(!B||B.over||!f||f.dead)return;
  const before=f.open||0,dmg=Math.max(20,Math.round((f.max||f.hp||100)*.06));
  f.open=0;f.breaks=(f.breaks||0)+1;f.hp=Math.max(0,f.hp-dmg);if(f.hp<=0)f.dead=true;
  popDmg(f,dmg,true,'💥 破勢 ');creditDamage(dmg);
  const el=document.getElementById(f.uid);if(el){el.classList.remove('blast');void el.offsetWidth;el.classList.add('blast');}
  toast('💥 5 連破勢！關閉 '+before+' 顆蓄力眼，BOSS -'+dmg+' HP',2200);shake(3);
}

function bossEyeBlast(f){
  if(!B||B.over||f.dead)return;
  const el=document.getElementById(f.uid);
  if(el){ el.classList.remove('blast'); void el.offsetWidth; el.classList.add('blast'); }
  const field=$('field');
  if(field){
    const fw=field.clientWidth, fh=field.clientHeight;
    for(let i=0;i<10;i++){
      const b=document.createElement('div');
      b.className='fx-eyebeam';
      b.style.left=(parseFloat(el?el.style.left:fw/2)+20)+'px';
      b.style.top=(parseFloat(el?el.style.top:60)+30)+'px';
      b.style.setProperty('--dx',((Math.random()-0.5)*fw*0.8)+'px');
      b.style.setProperty('--dy',(fh*0.5+Math.random()*40)+'px');
      b.style.animationDelay=(i*35)+'ms';
      field.appendChild(b);
      setTimeout(()=>b.remove(),900);
    }
    const fl=document.createElement('div');
    fl.className='fx-flash'; fl.style.background='#ff3b3b';
    field.appendChild(fl); setTimeout(()=>fl.remove(),400);
  }
  const raw=Math.round(f.atk*2.2*enemyAttackScale());
  cineBoss(f.n,raw);          // 全畫面毀滅演出
  shake(4);
  const ab=Math.min(B.block,raw), toHp=raw-ab;
  B.block-=ab;
  if(ab) popPlayer('🛡 -'+ab,'shield',0);
  if(toHp){
    if(B.pvp||(DUEL&&!DUEL.done)) B.myHp-=toHp; else S.hp-=toHp;
    popPlayer('-'+toHp,'hurt',ab?150:0);
    flash();
    if(!B.pvp&&!(DUEL&&!DUEL.done)&&S.hp>0){triggerFollowerSkills('defense',{damage:toHp,boss:true});triggerFollowerSkills('recovery',{damage:toHp,boss:true});}
  }
  toast('👁 '+f.n+' 全眼齊開 — 毀滅光束！',2000);
  renderAll();
  const hp=(B.pvp||(DUEL&&!DUEL.done))?B.myHp:S.hp;
  if(hp<=0){ if(B.pvp||(DUEL&&!DUEL.done))B.myHp=0; else S.hp=0; setTimeout(loseGame,600); }
}

function bulletTime(uid){
  const b=$('battle'); if(!b)return;
  const el=uid?document.getElementById(uid):null;
  b.classList.add('bullet');
  if(el) el.classList.add('ko');
  animPaused=true;
  // 白閃 + 放射線
  const field=$('field');
  if(field){
    const ko=document.createElement('div');
    ko.className='ko-burst';
    if(el){ ko.style.left=(parseFloat(el.style.left)+parseFloat(el.style.width)/2)+'px';
            ko.style.top=(parseFloat(el.style.top)+34)+'px'; }
    else { ko.style.left='50%'; ko.style.top='42%'; }
    for(let i=0;i<12;i++){
      const r=document.createElement('i');
      r.style.transform=`rotate(${i*30}deg) translateX(18px)`;
      ko.appendChild(r);
    }
    field.appendChild(ko);
    setTimeout(()=>ko.remove(),800);
  }
  shake();
  setTimeout(()=>{
    b.classList.remove('bullet');
    animPaused=false;
    runAnimQ();
  },560);
}

function killLootValue(f){
  const tier=Math.max(0,Number(S.zone)||0);
  return {xp:f.boss?2:1,gold:3+tier+(f.row?1:0)+(f.boss?32:0)};
}

function lootTargetRect(kind){
  const el=$(kind==='xp'?'battleXpBar':'battleGold');
  return el?el.getBoundingClientRect():{left:innerWidth/2,top:innerHeight*.72,width:1,height:1};
}

function lootGainText(kind,value,target){
  const n=document.createElement('div');n.className='lootGain '+kind;
  n.textContent=(kind==='xp'?'◆ +':'◉ +')+value;
  n.style.left=(target.left+target.width/2-22)+'px';n.style.top=(target.top-8)+'px';
  document.body.appendChild(n);setTimeout(()=>n.remove(),900);
}

function dropLootOrb(kind,start,index,owner){
  const n=document.createElement('span'),id='groundLoot_'+owner.uid+'_'+kind+'_'+index;
  n.id=id;n.className='lootOrb ground '+kind;n.innerHTML=kind==='xp'?'<b>XP</b>':'<b>◉</b>';
  n.style.left=start.x+'px';n.style.top=start.y+'px';document.body.appendChild(n);
  const spread=(index-1)*25+(Math.random()*18-9),lift=-32-Math.random()*28;
  const fall=Math.max(26,(start.groundY||start.y+42)-start.y)+(Math.random()*5-2);
  const rot=kind==='xp'?' rotate(45deg)':'';
  if(n.animate){
    const a=n.animate([
      {transform:'translate(0,0)'+rot+' scale(.45)',opacity:0},
      {transform:`translate(${spread*.48}px,${lift}px)`+rot+' scale(1.15)',opacity:1,offset:.30},
      {transform:`translate(${spread*.82}px,${fall}px)`+rot+' scale(.94)',opacity:1,offset:.62},
      {transform:`translate(${spread*.92}px,${fall-15}px)`+rot+' scale(1.03)',opacity:1,offset:.75},
      {transform:`translate(${spread*.97}px,${fall}px)`+rot+' scale(.97)',opacity:1,offset:.88},
      {transform:`translate(${spread}px,${fall-5}px)`+rot+' scale(1)',opacity:1,offset:.94},
      {transform:`translate(${spread}px,${fall}px)`+rot+' scale(1)',opacity:1}
    ],{duration:850+index*55,easing:'linear',fill:'forwards'});
    a.onfinish=()=>{n.style.left=(start.x+spread)+'px';n.style.top=(start.y+fall)+'px';n.style.transform=kind==='xp'?'rotate(45deg)':'';};
  }
  return id;
}

function collectGroundOrb(id,kind,target,delay){
  const n=document.getElementById(id);if(!n)return;
  const r=n.getBoundingClientRect(),tx=target.left+target.width/2-r.left-r.width/2,ty=target.top+target.height/2-r.top-r.height/2;
  n.classList.remove('ground');n.classList.add('collecting');
  n.style.setProperty('--trailAngle',(Math.atan2(-ty,-tx)*180/Math.PI)+'deg');
  setTimeout(()=>{
    if(n.animate){
      const rot=kind==='xp'?' rotate(45deg)':'';
      const a=n.animate([
        {transform:rot+' scale(1)',opacity:1},
        {transform:`translate(${tx*.22}px,${-38-Math.random()*24}px)`+rot+' scale(1.28)',opacity:1,offset:.28},
        {transform:`translate(${tx}px,${ty}px)`+rot+' scale(.22)',opacity:.08}
      ],{duration:760,easing:'cubic-bezier(.2,.82,.25,1)',fill:'forwards'});
      a.onfinish=()=>n.remove();
    }else setTimeout(()=>n.remove(),780);
  },delay);
}

function spawnKillLoot(f){
  if(!B||B.pvp||DUEL||f.lootDropped)return false;f.lootDropped=true;B.pendingLoot=(B.pendingLoot||0)+1;
  const el=document.getElementById(f.uid),r=el?el.getBoundingClientRect():$('field').getBoundingClientRect();
  const start={x:r.left+r.width/2,y:r.top+r.height*.42,groundY:r.bottom-13},value=killLootValue(f);
  f.lootValue=value;f.lootNodes=[];
  for(let i=0;i<3;i++)f.lootNodes.push({id:dropLootOrb('coin',start,i,f),kind:'coin'});
  for(let i=0;i<Math.min(2,value.xp);i++)f.lootNodes.push({id:dropLootOrb('xp',{x:start.x+(i?12:-8),y:start.y,groundY:start.groundY},i,f),kind:'xp'});
  return true;
}

function emitUnclaimedKillLoot(){
  if(!B||B.pvp||DUEL)return 0;let n=0;
  for(const f of B.foes||[])if(f.dead&&!f.lootDropped&&spawnKillLoot(f))n++;
  return n;
}

function refreshBattleLootHud(){
  const gold=$('battleGold'),lv=$('battleLv'),bar=$('battleXpBar'),fill=$('battleXpFill'),txt=$('battleXpText');
  if(gold)gold.textContent='◉ '+S.gold;if(lv)lv.textContent='Lv.'+S.lv;
  const pct=Math.max(0,Math.min(100,S.xp/Math.max(1,S.xpNeed)*100));if(fill)fill.style.width=pct+'%';
  if(txt)txt.textContent=S.xp+'/'+S.xpNeed;if(bar)bar.classList.toggle('full',S.xp>=S.xpNeed);
}

function absorbAllGroundLoot(done){
  if(!B||B.lootCollected){done&&done();return;}
  if(B.lootAbsorbing)return;
  B.lootAbsorbing=true;
  const drops=(B.foes||[]).filter(f=>f.lootDropped&&!f.lootAbsorbed);
  let gold=0,xp=0,kills=0,nodes=[];
  for(const f of drops){
    const v=f.lootValue||killLootValue(f);f.lootAbsorbed=true;gold+=v.gold;xp+=v.xp;kills++;
    nodes=nodes.concat(f.lootNodes||[]);
  }
  const gt=lootTargetRect('gold'),xt=lootTargetRect('xp');
  nodes.forEach((o,i)=>collectGroundOrb(o.id,o.kind,o.kind==='xp'?xt:gt,Math.min(140,i*18)));
  setTimeout(()=>{
    if(!B)return;
    S.gold+=gold;S.xp+=xp;B.lootGold=gold;B.lootXp=xp;B.lootKills=kills;B.pendingLoot=0;
    B.lootCollected=true;B.lootAbsorbing=false;
    lootGainText('coin',gold,gt);lootGainText('xp',xp,xt);
    refreshBattleLootHud();updBar();saveChar();done&&done();
  },nodes.length?980:40);
}

function resolvePendingLevelUps(done){
  if(S.xp<S.xpNeed){done&&done();return;}
  S.xp-=S.xpNeed;S.lv++;S.xpNeed++;if(B)B.levelsGained=(B.levelsGained||0)+1;
  applyLevelGrowth();refreshBattleLootHud();
  levelUp(()=>resolvePendingLevelUps(done));
}

function queueBattleVictory(){
  if(!B||B.victoryFinalizing)return;
  if(B.teacherPrologue){
    const teacher=B.foes.find(f=>f.teacherBoss);if(teacher){teacher.hp=1;teacher.dead=false;renderAll();}
    return;
  }
  if(B.teacherFinal){B.victoryFinalizing=true;B.over=true;clearInterval(rTimer);setTimeout(hiddenTeacherVictory,900);return;}
  B.victoryQueued=true;B.busy=true;
  const finish=()=>{
    if(!B||B.victoryFinalizing)return;
    if(S.xp>=S.xpNeed){B.leveling=true;resolvePendingLevelUps(()=>{B.leveling=false;setTimeout(finish,80);});return;}
    B.victoryFinalizing=true;winBattle();
  };
  emitUnclaimedKillLoot();
  // 留一小段時間欣賞地面掉落，再讓全部戰利品同時飛向經驗條與金幣欄。
  setTimeout(()=>absorbAllGroundLoot(finish),1250);
}

function breakCombo(){
  const n=$('comboBig');
  n.classList.remove('brk');void n.offsetWidth;n.classList.add('brk');
  toast('連擊中斷 — 重新計算',1000);
}

function popCombo(){const n=$('comboBig');n.classList.remove('pop');void n.offsetWidth;n.classList.add('pop');}

function flash(){
  const f=$('field');f.style.filter='brightness(2.2) saturate(.4)';
  setTimeout(()=>f.style.filter='',150);
}

function winBattle(){
  if(B.pvp&&B.pvp.practice){ practiceEnd(true); return; }
  if(B.pvp){ duelWin(); return; }
  B.over=true;clearInterval(rTimer);
  const killed=new Set(B.foes.map(f=>f.squad));
  const bossDown=B.foes.some(f=>f.boss);
  const captureCandidate=rollCaptureCandidate();
  for(const m of mobs){if(killed.has(m.id))m.alive=0;m.inBattle=0;}
  fbMarkMobs([...killed]);
  const totalKilled=B.foes.length;
  if(B.cur.length>B.bestArr.length) B.bestArr=B.cur.slice();
  if(B.cur.length) B.chains.push(B.cur.length);
  S.allChains=(S.allChains||[]).concat(B.chains);
  const arr=B.bestArr, n=arr.length;
  const a1=n?arr[0]:0, an=n?arr[n-1]:0, sum=arr.reduce((x,y)=>x+y,0);
  const gauss=n?Math.round(n*(a1+an)/2):0;
  const all=S.allChains.slice().sort((x,y)=>x-y);
  const avg=all.length?(all.reduce((x,y)=>x+y,0)/all.length).toFixed(2):'0';
  const med=all.length?(all.length%2?all[(all.length-1)/2]:((all[all.length/2-1]+all[all.length/2])/2)):0;
  const cb=B.best,xpGain=B.lootXp||0,goldGain=B.lootGold||0,levels=B.levelsGained||0;
  const grade=cb>=10?'S':cb>=7?'A':cb>=4?'B':'C';
  fbPushDeck();
  clearBattleTemporaryState();
  saveChar();updBar();
  overlay(`<div class="kicker">BATTLE CLEAR</div><h1>戰鬥勝利</h1>
    <div class="rank">評價 ${grade}　·　最高連擊 ${cb}　·　殲滅 ${totalKilled} 隻</div>
    <div class="resultLoot">
      <div><b>◉ +${goldGain}</b><span>吸收金幣・共 ${S.gold}</span></div>
      <div><b>◆ +${xpGain}</b><span>經驗寶石・${S.xp}/${S.xpNeed}</span></div>
      <div><b>${levels?'Lv. +'+levels:'Lv.'+S.lv}</b><span>${levels?'已完成卡牌三選一':'距升級 '+Math.max(0,S.xpNeed-S.xp)+' XP'}</span></div>
    </div>
    <div class="desc" style="text-align:center;margin:5px 0">剩餘生命 <b>${S.hp}/${S.maxhp}</b>　·　連擊不會自動回血</div>
    ${bossDown?'<div class="rank" style="margin-top:8px;color:#ffe38a;border-color:#ffe38a;background:rgba(255,227,138,.1)">👑 守衛掉落了稀有寶箱</div>':''}
    <details class="resultMore"><summary>📊 展開戰鬥與數學統計</summary><div class="mathbox">
      <div class="mh">📐 本場最長連擊的費用數列</div>
      <div class="seq">${n?arr.join(' , '):'（無）'}</div>
      ${n>1?`<div class="ml">首項 a₁ = <b>${a1}</b>　末項 aₙ = <b>${an}</b>　項數 n = <b>${n}</b>　公差 d = <b>${B.delta}</b></div>
      <div class="ml">高斯求和　Sₙ = n(a₁+aₙ)/2 = ${n}×(${a1}+${an})/2 = <b>${gauss}</b>
       　實際總費用 <b>${sum}</b> ${gauss===sum?'✓ 相符':'※ 中途使用通用卡接續'}</div>`:''}
      <div class="mh" style="margin-top:9px">📊 累積連擊統計</div>
      <div class="ml">樣本數 <b>${all.length}</b>　平均數 <b>${avg}</b>　中位數 <b>${med}</b>
        　最長 <b>${all.length?all[all.length-1]:0}</b></div>
      <div class="ml">學習題目正確率 <b>${quizStats.total?Math.round(quizStats.ok/quizStats.total*100):0}%</b>
        （${quizStats.ok}/${quizStats.total}）</div>
    </div></details>
    ${coop&&PARTY.length?`<div class="mathbox"><div class="mh">👥 隊伍貢獻</div>
      ${PARTY.map(m=>`<div class="ml"><b>${m.name}</b>（${JOBS[m.job].n}）　傷害 ${m.stat.dmg}　
        最長連擊 ${m.stat.bestChain}　答題 ${m.stat.quizTotal?m.stat.quizOk+'/'+m.stat.quizTotal:'—'}</div>`).join('')}
      </div>`:''}
    <button class="go" id="ok">${captureCandidate?'查看怪物反應':bossDown?'開啟稀有寶箱':'繼續探索'}</button>`,()=>{
      const proceed=()=>{if(bossDown){B_quizDone=0;chestLucky=false;openChest(true);return;}backToDungeon();};
      if(captureCandidate){capturePrompt(captureCandidate,proceed);return;}
      proceed();
    });
}

function loseGame(){
  if(B.pvp&&B.pvp.practice){ practiceEnd(false); return; }
  if(B.pvp){ duelLose(); return; }
  if(B.teacherPrologue){
    B.over=true;clearInterval(rTimer);clearBattleTemporaryState();saveChar();
    setTimeout(()=>teacherPrologueFallen(0),320);return;
  }
  if(B.teacherFinal){B.over=true;clearInterval(rTimer);clearBattleTemporaryState();setTimeout(hiddenTeacherRetry,350);return;}
  B.over=true;clearInterval(rTimer);clearBattleTemporaryState();saveChar();
  classroomDeathReported=!!classroomCheckpoint('death',{title:'地下城戰鬥倒下'});
  overlay(`<div class="kicker">YOU DIED</div>
    <h1 style="color:#e05a5a;text-shadow:0 3px 0 #5a1010">倒下了</h1>
    <div class="rank" style="color:#e05a5a;border-color:#e05a5a;background:rgba(224,90,90,.1)">Lv.${S.lv} · 最高連擊 ${B.best}</div>
    <div class="desc">敵人越多，陣型越寬、每回合傷害越高。<br>
      在<b>走廊</b>接戰比房間安全 —— 視野窄，驚動的巡邏隊也少。</div>
    <button class="go" id="ok">記錄成績</button>`,()=>nameEntry(false));
}

function levelGrowth(){return {hp:0,mana:0};}

function applyLevelGrowth(){
  S.hp=S.maxhp;
  saveChar();
  toast('⬆ Lv.'+S.lv+'　生命完全回復　解鎖關卡卡牌三選一',2400);
}

function levelUp(done){
  const z=zoneOf();
  // 優先只使用目前關卡卡池；若通用卡已滿使選項不足，再補同階基本卡。
  let pool=[...(z.cards||[]),'knife','wand','whip','axe','bible'].filter((id,i,a)=>CARDS[id]&&a.indexOf(id)===i);
  const capped=wildFull();
  pool=pool.filter(id=>!(capped&&isWild(id)));
  const fresh=pool.filter(id=>!S.deck.some(d=>d.id===id));
  const src=fresh.length>=3?fresh:pool;      // 盡量不給重複的選項
  const o=[];
  let guard=0;
  while(o.length<3&&guard++<80){ const id=rollCard(src,false); if(!o.includes(id))o.push(id); }
  overlay(`<div class="kicker">LEVEL UP</div><h1>Lv.${S.lv}</h1>
    <div class="rank">${z.ic} ${z.n}・關卡卡池三選一</div>
    <div class="mathbox" style="margin:8px 0">
      <div class="ml">❤ 生命完全回復 <b>${S.hp}/${S.maxhp}</b>（上限不增加）</div>
      <div class="ml" style="color:#8fd0ff">💧 魔力維持 ${S.mana}；請用通用卡回魔延長連擊</div>
    </div>
    <div class="rank">選擇一張加入牌組</div>
    <div class="picks">${o.map((id,i)=>{const c=CARDS[id];
      const R=RARITY[c.r||'C'];
      return `<div class="pick${c.wild?' wild':''}" data-i="${i}" style="border-color:${R.col}">
        <div class="pc">${c.wild?'✦ 通用・法力 '+c.c:'法力 '+c.c}
          <span class="rtag" style="color:${R.col}">${R.n}</span></div>
        <div class="pn">${c.n}</div><div class="pt">${c.t}</div></div>`;}).join('')}</div>`,
    null,el=>{
      const i=el.closest('.pick')?.dataset.i;if(i==null)return false;
      const id=o[i],gained=gainCard(id,true);
      if(gained){
        toast('加入牌組：'+CARDS[id].n);
        if(B&&!B.over&&Array.isArray(B.disc))B.disc.push({id,gem:null});
      }else toast('卡牌已分解為資源',1600);
      done?done():backToDungeon();return true;
    });
}

function rollTactical(){return TACTICAL_DROP[rand(TACTICAL_DROP.length)];}

function grantTactical(k,n){
  S.pot=normalizePot(S.pot);S.pot[k]=(S.pot[k]||0)+(n||1);saveChar();return POTIONS[k];
}

function showTacticalDrop(k,after){
  const I=grantTactical(k,1);
  overlay(`<div class="kicker">TACTICAL ITEM</div><h1>${I.ic} ${I.n}</h1>
    <div class="rank" style="color:${I.col};border-color:${I.col}">一次性戰術卡　目前 ×${S.pot[k]}</div>
    <div class="desc">${I.d}<br><b>使用後即消耗</b>，可從戰鬥右下角的「🧪 道具」開啟。</div>
    <button class="go" id="ok">收下</button>`,after||backToDungeon);
}

function openChest(rare){
  if(!B_quizDone){} // 進入時由上方流程控制
  // 1) 進化優先：卡牌已鑲上對應寶石 → 昇華最終形態
  const ev=S.deck.find(o=>o&&CARDS[o.id]&&CARDS[o.id].evo&&o.gem===CARDS[o.id].gem);
  if(ev){
    const base=CARDS[ev.id], evo=CARDS[base.evo];
    let cnt=0;
    for(const o of S.deck) if(o.id===ev.id&&o.gem===base.gem){o.id=base.evo;cnt++;}
    overlay(`<div class="kicker">EVOLUTION</div><h1>武器進化！</h1>
      <div class="rank">${base.n} + ${GEMS[base.gem].n} → ${evo.n}</div>
      <div class="desc">鑲著 <b>${GEMS[base.gem].n}</b> 的 <b>${base.n}</b> ×${cnt}
        已昇華為 <i>${evo.n}</i>（寶石保留）。<br>${evo.t.replace(/<\/?[a-z]+>/g,'')}</div>
      <button class="go" id="ok">收下</button>`,backToDungeon);
    return;
  }
  // 2) 稀有寶箱：先解雞兔同籠，答對多拿一顆寶石
  if(rare && !B_quizDone){
    B_quizDone=1;
    quizAsk(dungeonActionQuestion(genRareQ),ok=>{
      if(ok){ const g2=pickGem(); if(g2)S.gems.push(g2);S.gold+=4;
        toast('答對！額外獲得 '+(g2?GEMS[g2].n+' ＋ ':'')+'4 金幣',1800); }
      openChest(true);
    },dungeonActionLabel('稀有寶箱'));
    return;
  }
  if(rare){
    const g=pickGem(),item=rollTactical(),I=grantTactical(item,1),gold=45+Math.max(0,Number(S.zone)||0)*10;
    const cardId=Math.random()<.12?rollCard(unlockedCards(),true):null;
    S.gold+=gold;if(g)S.gems.push(g);saveChar();
    overlay(`<div class="kicker">RARE TREASURE</div><h1>稀有寶箱</h1>
      <div class="rank">◉ ${gold}　${g?GEMS[g].ic+' '+GEMS[g].n+'　':''}${I.ic} ${I.n}</div>
      <div class="desc">永久卡牌掉落已降低；寶箱主要提供金幣、寶石與<b>一次性戰術卡</b>。<br>
        ${I.ic} <b>${I.n}</b>：${I.d}${cardId?`<br><i>幸運！另發現稀有卡牌「${CARDS[cardId].n}」</i>`:''}</div>
      <button class="go" id="ok">${cardId?'查看卡牌':'收下'}</button>`,
      ()=>cardId?offerCard(cardId,backToDungeon):backToDungeon());
    return;
  }
  // 3) 一般寶箱：先解機率題，答對提升掉落品質
  if(!B_quizDone){
    B_quizDone=1;
    (classroomBankActive()?cb=>quizAsk(dungeonActionQuestion(genChestQ),cb,dungeonActionLabel('寶箱試煉')):(Math.random()<0.5?errorSpotAsk:cb=>quizAsk(genChestQ(),cb,'寶箱試煉')))(ok=>{
      const charm=(S.luckChest||0)>0;if(charm)S.luckChest--;
      chestLucky=ok||charm;
      if(chestLucky)toast(charm?'🍀 幸運星生效：掉落品質提升':'答對！掉落品質提升',1500);
      openChest(false);
    },'寶箱機率');
    return;
  }
  const roll=Math.random(),goldCut=chestLucky?.32:.42,itemCut=chestLucky?.68:.80,gemCut=chestLucky?.90:.95;
  if(roll<goldCut){
    const gold=12+rand(13)+(chestLucky?8:0);S.gold+=gold;saveChar();
    overlay(`<div class="kicker">TREASURE</div><h1>🪙 金幣袋</h1>
      <div class="rank">◉ +${gold}　目前 ${S.gold}</div>
      <div class="desc">可用於商店、強化與地城補給。答對寶箱題或使用幸運星會提高大獎品質。</div>
      <button class="go" id="ok">收下</button>`,backToDungeon);return;
  }
  if(roll<itemCut){showTacticalDrop(rollTactical());return;}
  if(roll<gemCut){
    const g=pickGem();
    if(!g){S.gold+=15;toast('寶石池已清空，改獲得 15 金幣');return backToDungeon();}
    S.gems.push(g);
    overlay(`<div class="kicker">TREASURE</div><h1>${GEMS[g].ic} ${GEMS[g].n}</h1>
      <div class="rank">${GEMS[g].d.replace(/<\/?b>/g,'')}</div>
      <div class="desc">寶石要<b>鑲嵌到一張卡牌上</b>才會生效，只影響那張卡。<br>
        鑲對組合再開寶箱，該武器就會<i>進化成最終形態</i>。</div>
      <button class="go" id="ok">選擇鑲嵌的卡牌</button>`,()=>socketScreen(g));
    return;
  }
  // 永久卡牌：一般 5%，答對／幸運時 10%。其餘 90～95% 都是資源或一次性道具。
  const pool=unlockedCards();
  const id=rollCard(pool,chestLucky);
  offerCard(id);
}

function socketScreen(g){
  const G=GEMS[g];
  if(!G){toast('寶石資料失效，已安全返回',1800);backToDungeon();return;}
  // 寶石每次只與隨機三張卡共鳴，避免長牌組出現整頁清單。
  const picks=shuffle(S.deck.map((o,i)=>({o,i})).filter(x=>x.o&&CARDS[x.o.id])).slice(0,3);
  const rows=picks.map(({o,i})=>{
    if(!o||!CARDS[o.id])return '';
    const b=CARDS[o.id], e=effCard({id:o.id,gem:g});
    const willEvo = b.evo&&b.gem===g;
    return `<div class="srow${o.gem?' taken':''}${willEvo?' evo':''}" data-i="${i}">
      <span class="sc px">${cardCostText(b)}${e.c!==b.c?'→'+e.c:''}</span>
      <span class="sn">${b.n}${willEvo?' <em>可進化！</em>':''}</span>
      <span class="sg">${o.gem?GEMS[o.gem].ic+GEMS[o.gem].n:'空插槽'}</span>
    </div>`;
  }).join('');
  overlay(`<div class="kicker">SOCKET</div><h1>${G.ic} 鑲嵌 ${G.n}</h1>
    <div class="rank">${G.d.replace(/<\/?b>/g,'')}</div>
    <div class="desc" style="margin-bottom:8px">寶石隨機感應出<b>三張卡牌</b>，請從中選一張鑲嵌。已有寶石會被取代並回收到背包。</div>
    <div id="sockList">${rows||'<div class="pempty">目前沒有可鑲嵌的卡牌</div>'}</div>
    <button class="go" id="socketCancel" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">取消</button>`,null,el=>{
      if(el.id==='socketCancel'){backToDungeon();return true;}
      const row=el.closest('.srow'); if(!row)return false;
      const idx=+row.dataset.i,o=S.deck[idx];
      if(!o||!CARDS[o.id]){toast('這張卡牌資料已變動，請重新選擇',1800);setTimeout(()=>socketScreen(g),10);return true;}
      const trial=S.deck.map(x=>({...x}));trial[idx].gem=g;
      const missing=missingDeckCosts(trial);
      if(missing.length){toast('牌組缺少 '+missing.join('、')+' 費卡，已自動補齊後再鑲嵌',2100);S.deck=sanitizeDeck(S.deck,S.job);setTimeout(()=>socketScreen(g),10);return true;}
      const q=dungeonActionQuestion(genSocketQ);
      if(!q){toast('題目暫時無法載入，請再試一次',1800);return false;}
      // 必須延後開啟：否則外層處理會在本回呼結束後立刻把新畫面關掉
      setTimeout(()=>quizAsk(q,ok=>{
        const target=S.deck[idx];
        if(!target||!CARDS[target.id]){toast('卡牌已變動，寶石沒有被消耗',1900);backToDungeon();return;}
        const oldGem=target.gem;
        target.gem=g;target.perfect=!!ok;
        const gi=S.gems.indexOf(g);if(gi>=0)S.gems.splice(gi,1);
        if(oldGem&&oldGem!==g&&GEMS[oldGem])S.gems.push(oldGem);
        if(ok){ toast('完美鑲嵌！'+CARDS[target.id].n+' 額外 +3 傷害',2200); }
        else toast(CARDS[target.id].n+' 鑲上 '+G.n,1600);
        saveChar();
        backToDungeon();
      },dungeonActionLabel('鑲嵌刻痕')),10);
      return true;
    });
}

function deckScreen(){
  const rows=S.deck.map((o,i)=>{
    const b=CARDS[o.id], c=effCard(o), R=RARITY[c.r||'C'];
    return `<div class="srow" data-dt="${i}" style="border-left:3px solid ${R.col}">
      <span class="sc px">${cardCostText(c)}</span>
      <span class="sn">${b.n}${b.EVO?' <em>★</em>':''}</span>
      <span class="sg">${o.gem?GEMS[o.gem].ic+GEMS[o.gem].n:'—'}　<i class="dtHint">詳情 ›</i></span></div>`;
  }).join('');
  const wc=wildCount();
  const counts={};
  for(const o of S.deck){const c=effCard(o).c;counts[c]=(counts[c]||0)+1;}
  const curve=Object.keys(counts).sort().map(k=>`${k}費 ×${counts[k]}`).join(' · ');
  overlay(`<div class="kicker">DECK</div><h1>牌組 ${S.deck.length} 張</h1>
    <div class="rank">法力上限 ${S.mana} · 法力之書 ×${S.tomes}</div>
    <div class="desc" style="margin-bottom:8px">費用分佈：<b>${curve}</b><br>
      🔒 0、1、2、3、4 費各至少保留一張；裝備戰技與各費用最後一張不能移除或融合。</div>
    <div id="sockList">${rows}</div>
    <button class="go" id="ok">關閉</button>`,backToDungeon,el=>{
    const row=el.closest('.srow');
    if(!row||row.dataset.dt===undefined) return false;
    setTimeout(()=>cardDetail(S.deck[+row.dataset.dt],'deck'),10);
    return true;
  });
}

function overlay(html,cb,pick){
  $('veilCard').classList.remove('course-wide','quiz-card');
  $('veilCard').innerHTML=html;
  $('veil').classList.remove('hide');
  $('veil').style.display='flex';        // 保險：確保一定看得到
  veilCb=cb;veilPick=pick;
  overlayOpenAt=Date.now();
}

function toast(t,ms=1700){
  const el=$('toast');el.textContent=t;el.classList.add('on');
  clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('on'),ms);
}

function backToDungeon(){
  clearInterval(rTimer);
  if(B&&B.over)clearBattleTemporaryState();
  const L=lead();
  fbPush({inBattle:0,dmg:(L&&L.stat.dmg)||0,chain:(L&&L.stat.bestChain)||0,
    quizOk:quizStats.ok,quizTotal:quizStats.total});
  $('battle').classList.add('hide');$('veil').classList.add('hide');
  $('field').querySelectorAll('.foe,.cursor,.dmgNum').forEach(n=>n.remove());
  $('dungeon').classList.remove('hide');
  updBar();running=true;requestAnimationFrame(loop);
}

function updBar(){
  const p=S.hp/S.maxhp*100,f=$('dhp');
  f.style.width=p+'%';f.classList.toggle('low',p<35);
  $('dhpt').textContent=S.hp+'/'+S.maxhp;
  $('dxp').style.width=(S.xp/S.xpNeed*100)+'%';
  $('dxpt').textContent=S.xp+'/'+S.xpNeed;
  $('lvl').textContent='Lv.'+S.lv;
  $('keyi').classList.toggle('on',S.key);
  $('manaTag').textContent='◆ 法力 '+S.mana;
  $('goldTag').textContent='◉ '+S.gold;
  const pt=$('potTag'); if(pt) pt.textContent='🧪 '+potCount();
  const cp=$('compTag');if(cp){cleanCompanions();cp.textContent='🐾 夥伴 '+S.followers.length+'/'+MAX_FOLLOWERS;cp.title=S.followers.length?S.followers.map(k=>companionDef(k).n+'・'+companionDef(k).skill).join('\n'):'戰鬥勝利後有低機率收服怪物';}
  const nt=$('netTag');
  if(nt){ if(FB.room){ nt.classList.remove('hide');
      nt.textContent='🌐 '+FB.room+' · '+(otherList().length+1)+'人'; }
    else nt.classList.add('hide'); }
  const ct=$('charTag');
  if(ct) ct.innerHTML = S.job
    ? `<span style="color:${JOBS[S.job].col}">${JOBS[S.job].ic}</span> ${S.name}`
    : '無名冒險者';
  $('compassDir').textContent=['▲','▶','▼','◀'][P.dir];
}

function mkTex(fn){const t=new Uint32Array(TS*TS);for(let y=0;y<TS;y++)for(let x=0;x<TS;x++)t[y*TS+x]=fn(x,y);return t;}

function mkSky(o){
  const W=SKYW,H=SKYH,d=new Uint32Array(W*H);
  let sd=o.seed||7;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647;};
  // 雲朵遮罩：隨機橢圓團
  const cloud=new Uint8Array(W*H);
  if(o.cloud){for(let c=0;c<16;c++){
    const cx0=rnd()*W,cy0=6+rnd()*H*.42,nb=2+((rnd()*3)|0);
    for(let k=0;k<nb;k++){
      const ex=cx0+(rnd()-.5)*46,ey=cy0+(rnd()-.5)*8,rx0=14+rnd()*20,ry0=5+rnd()*5;
      const x0=Math.max(0,ex-rx0|0),x1=Math.min(W-1,ex+rx0|0);
      const y0=Math.max(0,ey-ry0|0),y1=Math.min(H-1,ey+ry0|0);
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const dx0=(x-ex)/rx0,dy0=(y-ey)/ry0;
        if(dx0*dx0+dy0*dy0<1)cloud[y*W+((x+W)%W)]=1;
      }
    }}}
  // 遠山稜線
  const ridgeH=u=>o.ridge?18+Math.sin(u*.012)*9+Math.sin(u*.031+2)*5+Math.sin(u*.0065+5)*11:0;
  // 城堡剪影：主堡＋塔樓＋城齒（參考手繪像素城堡的輪廓）
  function castleH(u){
    if(!o.castle)return 0;
    let h=0;
    const seg=(u0,w,hh)=>{if(u>=u0&&u<u0+w)h=Math.max(h,hh);};
    seg(210,150,30);                                    // 城牆主體
    if(u>=210&&u<360&&((u-210)%10)<5)h=Math.max(h,34);  // 城齒
    const tower=(uc,w,hh)=>{const a=Math.abs(u-uc);
      if(a<w)h=Math.max(h,hh);
      if(a<w+5&&a>=w-1)h=Math.max(h,hh-(a-w+1)*3);      // 塔簷
      if(a<3)h=Math.max(h,hh+9-a*3);};                  // 尖頂
    tower(232,9,44);tower(338,9,44);tower(285,11,56);
    seg(690,90,22);tower(712,8,36);tower(758,8,40);
    return h;
  }
  for(let x=0;x<W;x++){
    const rh=ridgeH(x),ch=castleH(x);
    for(let y=0;y<H;y++){
      const t=y/H;
      let r=o.top[0]+(o.bot[0]-o.top[0])*t,
          g=o.top[1]+(o.bot[1]-o.top[1])*t,
          b=o.top[2]+(o.bot[2]-o.top[2])*t;
      if(o.sun){const du=Math.min(Math.abs(x-o.sun[0]),W-Math.abs(x-o.sun[0])),dv=y-o.sun[1];
        const dd=Math.sqrt(du*du+dv*dv);
        if(dd<o.sun[2]){r=o.sun[3][0];g=o.sun[3][1];b=o.sun[3][2];}
        else if(dd<o.sun[2]*2.4){const m=1-(dd-o.sun[2])/(o.sun[2]*1.4);
          r+=(o.sun[3][0]-r)*m*.6;g+=(o.sun[3][1]-g)*m*.6;b+=(o.sun[3][2]-b)*m*.6;}}
      const hz2=H-y;                       // 距地平線的高度
      if(ch&&hz2<=ch){const m=.55;         // 城堡：霧化剪影
        r=o.castle[0]*m+r*(1-m);g=o.castle[1]*m+g*(1-m);b=o.castle[2]*m+b*(1-m);}
      else if(rh&&hz2<=rh){const m=.6;
        r=o.ridge[0]*m+r*(1-m);g=o.ridge[1]*m+g*(1-m);b=o.ridge[2]*m+b*(1-m);}
      else if(o.cloud&&cloud[y*W+x]){r=o.cloud[0];g=o.cloud[1];b=o.cloud[2];}
      // 貼近地平線的薄霾
      if(t>.82){const m=(t-.82)/.18*.5;
        r+=(o.bot[0]-r)*m;g+=(o.bot[1]-g)*m;b+=(o.bot[2]-b)*m;}
      d[y*W+x]=rgb(r|0,g|0,b|0);
    }
  }
  return d;
}

function floorTheme(zi,fi){
  zi=Math.max(0,Math.min(THEMES.length-1,zi|0));
  const stage=Math.min(3,Math.floor(Math.max(0,fi|0)/3)),base=THEMES[zi];
  if(stage===0)return base;
  const key=zi+':'+stage;if(FLOOR_THEME_CACHE[key])return FLOOR_THEME_CACHE[key];
  const sky=stage===1
    ? (base.sky||{seed:70+zi,top:[72,104,170],bot:[190,204,225],cloud:[245,246,255],ridge:[100,112,145]})
    : stage===2
      ? {seed:120+zi,top:[74,150,226],bot:[205,232,244],cloud:[252,252,255],ridge:[118,165,142],castle:[154,172,190]}
      : {seed:180+zi,top:[54,48,116],bot:[246,174,104],sun:[512,SKYH-28,12,[255,231,166]],cloud:[250,208,170],ridge:[100,80,122],castle:[116,88,128]};
  const t={...base,sky:{...sky,castle:sky.castle||[146,154,184]},
    fog:stage===2?[150,198,210]:stage===3?[184,132,116]:base.fog,
    fA:stage===2?[126,180,112]:stage===3?[210,184,128]:base.fA,
    fB:stage===2?[104,156,92]:stage===3?[180,150,98]:base.fB,
    mini:{...(base.mini||{}),fA:stage===2?'#7eb470':stage===3?'#d2b880':base.mini.fA,
      fB:stage===2?'#689c5c':stage===3?'#b49662':base.mini.fB}};
  FLOOR_THEME_CACHE[key]=t;return t;
}

function applyTheme(zi,fi=0){
  const t=floorTheme(zi,fi);
  if(CUR_TH===t)return;
  CUR_TH=t;
  FOG_R=t.fog[0];FOG_G=t.fog[1];FOG_B=t.fog[2];
  SPR_FOG='rgba('+t.fog[0]+','+t.fog[1]+','+t.fog[2]+',';
  F_A=rgb(t.fA[0],t.fA[1],t.fA[2]);F_B=rgb(t.fB[0],t.fB[1],t.fB[2]);
  C_A=rgb(t.cA[0],t.cA[1],t.cA[2]);C_B=rgb(t.cB[0],t.cB[1],t.cB[2]);
  CUR_WALL=t.wallGen?(t._wt||(t._wt=mkTex(t.wallGen))):null;
  CUR_SKY=t.sky?(t._sk||(t._sk=mkSky(t.sky))):null;
  for(const k in ART)delete ART[k];   // 精靈霧化快取跟著主題重建
}

function artOf(t,kind,alert){
  const key=t+kind+(alert?'!':'');
  if(ART[key])return ART[key];
  let c;
  if(t==='mob')c=foeArt(kind);
  else{
    c=document.createElement('canvas');c.width=c.height=32;
    const g=c.getContext('2d');
    const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    if(kind==='chest'){R(6,15,20,12,'#8a5a2a');R(6,13,20,4,'#b5772f');R(4,8,24,6,'#c98a3c');
      R(6,8,20,2,'#ecca6a');R(14,12,4,9,'#ecc24e');}
    if(kind==='key'){R(8,6,3,12,'#ecc24e');R(19,6,3,12,'#ecc24e');R(8,6,14,3,'#ecc24e');
      R(8,15,14,3,'#ecc24e');R(13,18,4,10,'#ecc24e');R(17,21,4,3,'#ecc24e');R(17,25,4,3,'#ecc24e');}
    if(kind==='stair'){R(2,24,28,6,'#5a4a86');R(7,18,23,6,'#6d5aa0');R(12,12,18,6,'#8a72c4');R(17,5,13,7,'#a892e0');}
    if(kind==='exit'){R(8,2,16,28,'#ecc24e');R(11,5,10,24,'#57b6ea');R(13,10,6,14,'#bfe8ff');}
    if(kind==='shop'){R(6,10,20,18,'#5a3f7a');R(4,6,24,5,'#8a5ac0');R(6,6,20,2,'#c9a8f0');
      R(12,16,8,12,'#2a1a3d');R(14,20,2,2,'#ecc24e');R(9,13,3,3,'#ffe38a');R(20,13,3,3,'#ffe38a');}
    if(kind.startsWith('npc_')){ g.drawImage(npcArt(kind.slice(4)),0,0); }
    if(kind.startsWith('rival_')){
      const a=AI_FOES.find(x=>x.k===kind.slice(6))||AI_FOES[0];
      R(11,4,10,9,'#f0d0a8');R(13,7,2,2,'#2a1a10');R(18,7,2,2,'#2a1a10');
      R(9,1,14,4,'#2a1f40');
      R(8,13,16,15,a.col);R(8,13,16,3,'#ffffff44');
      R(4,15,4,11,'#3a2c60');R(24,15,4,11,'#3a2c60');
      R(10,28,5,4,'#2a1f40');R(17,28,5,4,'#2a1f40');
      // 難度徽記：頭上的小方塊數 = 難度等級
      const lvIdx=AI_FOES.indexOf(a)+1;
      for(let i=0;i<lvIdx;i++) R(6+i*4,0,3,3,a.col);
      // 躲過一次的對手：紅色怒氣標記
      const rv=rivals.find(x=>x.alive&&('rival_'+x.k)===kind&&x.fled);
      if(rv){ R(2,2,3,3,'#ff3b3b'); R(27,2,3,3,'#ff3b3b');
              R(11,6,10,2,'#ff3b3b'); }
    }
    if(kind.startsWith('ghost_')){
      const J=JOBS[kind.slice(6)]||JOBS.geo;
      // 半透明的同學身影
      g.globalAlpha=0.72;
      R(11,6,10,9,'#dfe8ff');R(13,9,2,2,'#2a1a10');R(18,9,2,2,'#2a1a10');
      R(8,15,16,15,J.col);R(8,15,16,3,'#ffffff55');
      R(6,30,20,2,'#00000055');
      g.globalAlpha=1;
    }
    if(kind==='bed'){
      R(4,16,24,12,'#8a5a2a');R(4,16,24,3,'#b5772f');
      R(6,10,10,7,'#dfe8ff');R(6,10,10,2,'#fff');
      R(4,28,3,4,'#5a3a18');R(25,28,3,4,'#5a3a18');
      R(17,13,10,4,'#c05a7a');
    }
    if(kind==='gemchest'){
      R(6,15,20,12,'#3a5a7a');R(6,13,20,4,'#4a7aaa');R(4,8,24,6,'#5a8aca');
      R(6,8,20,2,'#9fd0ff');R(13,11,6,6,'#e26bd6');R(15,13,2,2,'#fff');
    }
    if(kind==='cardchest'){
      R(6,15,20,12,'#5a3a7a');R(6,13,20,4,'#7a5aaa');R(4,8,24,6,'#8a6aca');
      R(6,8,20,2,'#c9a8f0');R(12,11,4,7,'#ffe38a');R(17,12,4,6,'#ffe38a');
    }
    if(kind==='restout'){
      R(10,4,12,24,'#3a2c60');R(12,6,8,20,'#8fe86a');R(14,14,4,4,'#dfffdf');
    }
    if(kind==='waypoint'){
      R(3,25,26,5,'#263e58');R(6,22,20,4,'#3f78a8');R(9,19,14,4,'#70cfff');
      R(13,6,6,14,'#bff6ff');R(11,8,10,4,'#70cfff');R(11,14,10,4,'#70cfff');
      R(14,2,4,5,'#ffffff');R(7,10,3,3,'#8fe86a');R(22,10,3,3,'#8fe86a');
    }
    if(kind==='forge'){
      R(4,20,24,10,'#5a3020');R(4,20,24,3,'#8a5030');
      R(8,10,16,10,'#3a2018');R(10,12,12,7,'#ff8a3a');R(12,14,8,4,'#ffe38a');
      R(6,6,4,5,'#6a4030');R(22,6,4,5,'#6a4030');
      R(14,2,4,5,'#ff6a3a');R(15,0,2,3,'#ffb37a');
    }
    if(kind==='numline'){
      R(2,20,28,3,'#8fd0ff');
      for(let i=0;i<7;i++) R(3+i*4,17,2,9,'#bfe8ff');
      R(15,14,2,15,'#ffe38a');
      R(6,8,20,5,'#3f7fd0');R(8,9,16,3,'#8fd0ff');
    }
    if(kind==='wraith'){ g.globalAlpha=.85;
      R(10,4,12,12,'#4a2a5a');R(12,7,3,3,'#e26bd6');R(17,7,3,3,'#e26bd6');
      R(8,16,16,10,'#6a3a7a');R(11,26,4,5,'#4a2a5a');R(17,26,4,5,'#4a2a5a');
      R(13,20,6,2,'#e26bd6');R(14,11,4,2,'#f0a8e8');g.globalAlpha=1; }
    if(kind==='shrine'){ R(6,22,20,8,'#6a5aa0');R(8,10,16,12,'#8a72c4');
      R(10,6,12,5,'#a892e0');R(12,2,8,4,'#ffe38a');R(13,13,6,7,'#ffe38a');
      R(4,26,24,4,'#4a3b73'); }
    if(kind==='beastshrine'){
      R(3,25,26,5,'#284b35');R(5,21,22,5,'#3d7650');R(8,17,16,5,'#55a86a');
      R(6,7,7,10,'#203f2d');R(19,7,7,10,'#203f2d');
      R(8,5,4,4,'#91f08d');R(20,5,4,4,'#91f08d');R(8,10,2,2,'#ffe56f');R(22,10,2,2,'#ffe56f');
      R(14,4,4,14,'#c7ff9f');R(12,7,8,3,'#74df82');R(12,13,8,3,'#74df82');
      R(15,20,2,5,'#ffe56f');R(4,28,24,3,'#173524');
    }
  }
  if(alert){const g=c.getContext('2d');g.fillStyle='#ff3b3b';g.fillRect(15,0,3,7);g.fillRect(15,8,3,3);}
  const ks=String(kind||''),isCharacter=t==='mob'||ks.startsWith('npc_')||ks.startsWith('rival_')||ks.startsWith('ghost_');
  const silhouette=[0,0,.12,.34,.58,.76,.90,.97];
  const lv=[];
  for(let i=0;i<8;i++){
    const d=document.createElement('canvas');d.width=32;d.height=32;
    const g=d.getContext('2d');g.drawImage(c,0,0);
    g.globalCompositeOperation='source-atop';
    // 遠距精靈染上「目前主題」的大氣霧色，與場景霧化一致
    g.fillStyle=SPR_FOG+(i/8*.8).toFixed(3)+')';g.fillRect(0,0,32,32);
    // 怪物與人物在遠處只保留黑色輪廓；靠近時分段恢復原色，避免提早看穿種類。
    if(isCharacter&&silhouette[i]>0){g.fillStyle='rgba(3,3,8,'+silhouette[i]+')';g.fillRect(0,0,32,32);}
    lv.push(d);
  }
  return ART[key]={lv};
}

function render(){
  const ang=P.aang,dx=Math.sin(ang),dy=-Math.cos(ang);
  const px=-dy*.66,py=dx*.66,hz=RH>>1;
  const PX=P.ax+.5,PY=P.ay+.5;
  // 露天主題：天花板換成天空貼圖（依視角橫向捲動，遠方城堡跟著轉）
  const SKY=CUR_SKY;let skyU=null;
  if(SKY){
    skyU=render._u||(render._u=new Int32Array(RW));
    const b2=SKYW/(Math.PI*2);
    for(let x=0;x<RW;x++){
      const a2=ang+Math.atan(.66*(2*x/RW-1));
      skyU[x]=(((a2*b2)%SKYW+SKYW)|0)%SKYW;
    }
  }
  for(let y=0;y<RH;y++){
    if(SKY&&y<=hz){
      const ro=Math.min(y,SKYH-1)*SKYW,b=y*RW;
      for(let x=0;x<RW;x++)buf[b+x]=SKY[ro+skyU[x]];
      continue;
    }
    const isF=y>hz,p=isF?(y-hz):(hz-y);
    if(p<=0){for(let x=0;x<RW;x++)buf[y*RW+x]=C_B;continue;}
    const rd=(RH*.5)/p;
    const sx=rd*(dx+px)*2/RW,sy=rd*(dy+py)*2/RW;
    let fx=PX+rd*(dx-px),fy=PY+rd*(dy-py);
    // 衰減曲線放緩：近處清晰、遠處平滑融入霧色（地平線自然透出微光）
    let f=1/(1+rd*.10+rd*rd*.035);if(!isF)f*=.78;
    const b=y*RW;
    for(let x=0;x<RW;x++){
      const alt=(((fx*4)&3)^((fy*4)&3))&1;
      let col=isF?(alt?F_B:F_A):(alt?C_B:C_A);
      // 陷阱不預先變色，踩到才觸發
      buf[b+x]=fogShade(col,f);
      fx+=sx;fy+=sy;
    }
  }
  for(let x=0;x<RW;x++){
    const cam=2*x/RW-1,rx=dx+px*cam,ry=dy+py*cam;
    let mx=PX|0,my=PY|0;
    const ddx=Math.abs(1/rx),ddy=Math.abs(1/ry);
    let stx,sty,sdx,sdy;
    if(rx<0){stx=-1;sdx=(PX-mx)*ddx;}else{stx=1;sdx=(mx+1-PX)*ddx;}
    if(ry<0){sty=-1;sdy=(PY-my)*ddy;}else{sty=1;sdy=(my+1-PY)*ddy;}
    let side=0,hc='W';
    for(let g=0;g<64;g++){
      if(sdx<sdy){sdx+=ddx;mx+=stx;side=0;}else{sdy+=ddy;my+=sty;side=1;}
      if(mx<0||my<0||mx>=MW||my>=MH){hc='W';break;}
      const c=grid[my][mx];
      if(c==='W'||(c==='L'&&!S.key)){hc=c;break;}
    }
    const dist=side===0?(sdx-ddx):(sdy-ddy);
    zb[x]=dist;
    const lh=(RH/Math.max(dist,1e-4))|0;
    const a=Math.max(0,(-lh/2+hz)|0),bb=Math.min(RH,(lh/2+hz)|0);
    let wx=side===0?PY+dist*ry:PX+dist*rx;wx-=Math.floor(wx);
    let tx=(wx*TS)|0;if(side===0?rx>0:ry<0)tx=TS-1-tx;
    let tex=hc==='L'?T_DOOR:(CUR_WALL||T_STONE);
    if(hc==='W'&&murals[mx+','+my]) tex=T_MURAL;
    let f=1/(1+dist*.10+dist*dist*.032);if(side===1)f*=.74;if(hc==='L')f=Math.min(1,f*1.5);
    const st=TS/lh;let tp=(a-hz+lh/2)*st;
    for(let y=a;y<bb;y++){const ty=tp&(TS-1);tp+=st;buf[y*RW+x]=fogShade(tex[(ty|0)*TS+tx],f);}
  }
  cx2.putImageData(imgD,0,0);
  const list=[];
  for(const p of props)if(p.alive)list.push({x:p.x+.5,y:p.y+.5,t:'p',k:p.t==='npc'?'npc_'+p.k:p.t,al:0});
  // 一格 = 一支隊伍：畫成疊在一起的小群，一眼看出人數
  const CLUSTER=[[0,0,1],[-.28,.09,.86],[.27,.13,.83],[-.14,.2,.78]];
  if(!render.staticBattleBackdrop){
    for(const o of otherList()){
      list.push({x:o.x+.5,y:o.y+.5,t:'p',k:'ghost_'+(o.job||'geo'),al:0,ghost:o});
    }
    for(const r of rivals){
      if(!r.alive)continue;
      list.push({x:r.x+.5,y:r.y+.5,t:'p',k:'rival_'+r.k,al:r.chasing>0});
    }
    for(const m of mobs){
      if(!m.alive)continue;
      const show=Math.min(CLUSTER.length,m.size);
      for(let i=show-1;i>=0;i--){
        const [ox,oy,sc]=CLUSTER[i];
        list.push({x:m.x+.5+ox,y:m.y+.5+oy,t:'mob',k:m.art,
          al:m.state==='alert'&&i===0,boss:m.boss,csc:sc});
      }
    }
  }
  for(const e of list)e._d=(PX-e.x)**2+(PY-e.y)**2;
  list.sort((a,b)=>b._d-a._d);
  const inv=1/(px*dy-dx*py);
  for(const e of list){
    const rxx=e.x-PX,ryy=e.y-PY;
    const tX=inv*(dy*rxx-dx*ryy),tY=inv*(-py*rxx+px*ryy);
    if(tY<=.15)continue;
    const sp=artOf(e.t,e.k,e.al);
    const sc=(e.boss?1.15:e.t==='mob'?.82:e.k==='exit'?1:String(e.k).startsWith('npc_')?.92:.6)*(e.csc||1);
    const scr=((RW/2)*(1+tX/tY))|0;
    const h=Math.abs((RH/tY)*sc)|0,w=h;
    const off=(e.k==='chest'||e.k==='key')?.3:e.t==='mob'?.1:String(e.k).startsWith('npc_')?.06:.05;
    const y0=(hz-h/2+off*RH/tY)|0,x0=scr-(w>>1);
    if(x0+w<0||x0>RW)continue;
    const lvl=Math.min(7,Math.max(0,Math.round(Math.sqrt(e._d)*.88)));
    const src=sp.lv[lvl],sxs=32/w;
    const lo=Math.max(0,x0),hi=Math.min(RW,x0+w);
    let run=-1;
    for(let x=lo;x<=hi;x++){
      const ok=x<hi&&tY<zb[x];
      if(ok&&run<0)run=x;
      if((!ok||x===hi)&&run>=0){cx2.drawImage(src,(run-x0)*sxs,0,(x-run)*sxs,32,run,y0,x-run,h);run=-1;}
    }
  }
  drawWeapon(cx2,RW,RH);
  cx2.fillStyle='rgba(0,0,0,.3)';cx2.fillRect(0,0,RW,4);cx2.fillRect(0,RH-4,RW,4);
}

function drawWeapon(g,W,H){
  if(!g||drawWeapon.skip)return;
  bobT+=0.09;
  const moving=(Math.abs(P.ax-P.x)>0.01||Math.abs(P.ay-P.y)>0.01);
  const bob=moving?Math.sin(bobT*2.4)*5:Math.sin(bobT*0.7)*1.6;
  const sway=moving?Math.cos(bobT*1.2)*4:0;
  // 依牌組裡最貴的攻擊卡決定武器外觀
  let best=null,bc=-1;
  for(const o of S.deck){ const c=effCard(o);
    if((c.dmg||0)>bc){ bc=c.dmg||0; best=c; } }
  const classWeapon=S.classroomWeapon||null,weaponRarity=String(classWeapon&&classWeapon.rarity||'').toLowerCase();
  const col=classWeapon?(/legend/.test(weaponRarity)?'#c989ff':/rare/.test(weaponRarity)?'#73c9ff':'#e8d27d'):(best?RARITY[best.r||'C'].col:'#c98a3c');
  const bx=W*0.70+sway, by=H+bob;
  g.save();
  g.translate(bx,by);
  g.rotate(-0.22);
  const u=Math.max(1,Math.round(W/60));      // 像素單位（畫在低解析緩衝上）
  const R=(x,y,w,h,c2)=>{ g.fillStyle=c2; g.fillRect(x*u,y*u,w*u,h*u); };
  // 手（袖口＋拳頭）—— 袖口飾條染上職業代表色
  const J=JOBS[S.job]||null;
  R(-1,-4,7,6,'#3a2c60');
  if(J)R(-1,-4,7,2,J.col);
  R(0,-6,6,4,'#f0d0a8');
  R(0,-6,6,1,'#fff0d8');
  // 武器隨職業改變：劍士闊劍／術士法杖／射手弓箭／盜賊短刃／僧侶錫杖／詩人里拉琴
  const kind=S.job||'geo';
  if(kind==='alg'){                         // 代數術士：寶珠法杖
    R(2,-24,3,22,'#6b4a2a');R(2,-24,1,22,'#8a6a3f');
    R(0,-30,7,7,col);R(1,-29,2,2,'#ffffffcc');
    R(1,-25,5,1,'#3a2708');
  }else if(kind==='stat'){                  // 統計射手：長弓搭箭
    R(5,-30,2,26,'#8a5a2a');
    R(4,-31,4,3,'#8a5a2a');R(4,-6,4,3,'#8a5a2a');
    R(9,-29,1,24,'#e8e4d8');
    R(1,-20,7,2,'#c98a3c');R(0,-21,3,4,col);
  }else if(kind==='prob'){                  // 機率盜賊：短刃＋骰子墜飾
    R(2,-16,3,11,col);R(2,-16,1,11,'#ffffffaa');
    R(1,-18,5,3,'#e2e8ff');
    R(0,-6,7,2,'#8a6f2a');R(2,-4,3,3,'#5a4512');
    R(-3,-12,4,4,'#fff');R(-2,-11,1,1,'#000');
  }else if(kind==='num'){                   // 數論僧侶：錫杖
    R(2,-26,3,24,'#8a6f2a');R(2,-26,1,24,'#c9a44a');
    R(0,-30,7,3,'#ffe38a');
    R(0,-33,2,4,'#ffe38a');R(5,-33,2,4,'#ffe38a');
    R(2,-31,3,2,col);
  }else if(kind==='bard'){                  // 級數詩人：里拉琴
    R(0,-24,2,14,'#c9a44a');R(5,-24,2,14,'#c9a44a');
    R(0,-25,7,2,'#ffe38a');
    R(0,-10,7,4,'#8a5a2a');
    R(1,-23,1,13,'#e8e4d8');R(3,-23,1,13,'#e8e4d8');R(5,-23,1,13,'#e8e4d8');
    R(3,-28,1,3,col);
  }else if(kind==='ext'){                   // 外部角色：水晶刃
    R(2,-22,3,17,'#9fe8ff');R(2,-22,1,17,'#ffffffcc');
    R(1,-24,5,3,'#e2ffff');
    R(0,-7,7,2,'#3f5a8a');R(2,-5,3,4,'#1a3a6a');
  }else{                                    // 幾何劍士／未選職業：闊劍
    R(2,-22,3,17,col);R(2,-22,1,17,'#ffffffaa');
    R(1,-24,5,3,'#e2e8ff');
    R(0,-7,7,2,'#8a6f2a');R(2,-5,3,4,'#5a4512');
  }
  // 稀有度光暈
  if(best&&(best.r==='L'||best.r==='E')){
    g.globalAlpha=0.35;
    g.fillStyle=col;
    g.beginPath(); g.arc(3.5*u,-14*u,10*u,0,Math.PI*2); g.fill();
    g.globalAlpha=1;
  }
  g.restore();
  if(classWeapon&&classWeapon.name){
    g.save();g.font='bold '+Math.max(5,Math.round(W/55))+'px sans-serif';g.textAlign='right';g.fillStyle='rgba(10,8,20,.72)';g.fillRect(W-74,H-13,72,11);g.fillStyle='#ffe38a';g.fillText(String(classWeapon.name).slice(0,12),W-4,H-5);g.restore();
  }
}

function drawMini(){
  const s=mc.width/MW;
  mg.clearRect(0,0,mc.width,mc.height);
  const eT=Math.max(1,s*.22),eB=Math.max(1,s*.18);   // 牆頂亮邊／底暗邊厚度
  const MT=CUR_TH.mini;                              // 小地圖跟著區域主題配色
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    if(!seen[y][x])continue;
    const c=grid[y][x];
    if(c==='W'){
      mg.fillStyle=MT.wall;mg.fillRect(x*s,y*s,s,s);
      mg.fillStyle=MT.hi;mg.fillRect(x*s,y*s,s,eT);            // 頂端受光：立體感
      mg.fillStyle=MT.lo;mg.fillRect(x*s,y*s+s-eB,s,eB);       // 底部陰影
    }else if(c==='L'){
      mg.fillStyle='#ecc24e';mg.fillRect(x*s,y*s,s,s);
      mg.fillStyle='#fff0b0';mg.fillRect(x*s,y*s,s,eT);
    }else{
      mg.fillStyle=((x+y)&1)?MT.fA:MT.fB;                      // 棋盤格地板：格線更好數
      mg.fillRect(x*s,y*s,s,s);
    }
  }
  // 玩家視野扇形 —— 一眼看出面向與可見範圍
  mg.save();
  mg.translate((P.ax+.5)*s,(P.ay+.5)*s);
  mg.rotate(P.aang-Math.PI/2);
  mg.fillStyle='rgba(255,227,138,.13)';
  mg.beginPath();mg.moveTo(0,0);mg.arc(0,0,s*3.4,-.5,.5);mg.closePath();mg.fill();
  mg.restore();
  for(const m of mobs){
    if(!m.alive||!seen[m.y][m.x])continue;
    mg.fillStyle=m.state==='alert'?'rgba(255,60,60,.3)':'rgba(255,200,80,.2)';
    for(const [tx,ty] of coneTiles(m))mg.fillRect(tx*s,ty*s,s,s);
  }
  for(const p of props){
    if(!p.alive||!seen[p.y][p.x])continue;
    mg.fillStyle=p.t==='key'?'#ecc24e':p.t==='exit'?'#57b6ea':p.t==='stair'?'#a892e0':p.t==='waypoint'?'#70cfff':p.t==='shop'?'#c9a8f0':p.t==='npc'?'#8fe86a':p.t==='shrine'?'#ffe38a':p.t==='beastshrine'?'#8fe86a':p.t==='wraith'?'#e26bd6':p.t==='numline'?'#8fd0ff':p.t==='forge'?'#ff8a3a':p.t==='bed'?'#ff9ac0':p.t==='gemchest'?'#9fd0ff':p.t==='cardchest'?'#c9a8f0':p.t==='restout'?'#8fe86a':'#c98a3c';
    mg.fillRect(p.x*s+s*.25,p.y*s+s*.25,s*.5,s*.5);
  }
  // 取得鑰匙後用箭頭指出樓梯／出口方向 —— 隨機地圖很容易迷路
  if(S.key){
    const ex=props.find(o=>o.alive&&(o.t==='stair'||o.t==='exit'));
    if(ex){
      const dx=ex.x-P.x, dy=ex.y-P.y, d=Math.hypot(dx,dy);
      if(d>0.5){
        const ux=dx/d, uy=dy/d;
        const bx=(P.x+.5)*s, by=(P.y+.5)*s;
        mg.save(); mg.globalAlpha=.9;
        mg.strokeStyle='#8fe86a'; mg.lineWidth=2.5;
        mg.beginPath(); mg.moveTo(bx,by);
        mg.lineTo(bx+ux*s*1.6, by+uy*s*1.6); mg.stroke();
        const tx=bx+ux*s*2.2, ty=by+uy*s*2.2;
        mg.fillStyle='#8fe86a'; mg.beginPath();
        mg.moveTo(tx,ty);
        mg.lineTo(tx-ux*s*.8-uy*s*.45, ty-uy*s*.8+ux*s*.45);
        mg.lineTo(tx-ux*s*.8+uy*s*.45, ty-uy*s*.8-ux*s*.45);
        mg.closePath(); mg.fill(); mg.restore();
      }
    }
  }
  // 陷阱不顯示在小地圖 —— 踩到才會發現
  for(const r of rivals){
    if(!r.alive||!seen[r.y][r.x])continue;
    mg.fillStyle=r.a.col;
    mg.fillRect(r.x*s+s*.15,r.y*s+s*.15,s*.7,s*.7);
    if(r.fled){                            // 躲過的對手用紅框標示：再遇到就得打
      mg.strokeStyle='#ff3b3b'; mg.lineWidth=2;
      mg.strokeRect(r.x*s+s*.08,r.y*s+s*.08,s*.84,s*.84);
    }
    if(r.chasing>0){ mg.strokeStyle='#fff'; mg.lineWidth=1.5;
      mg.strokeRect(r.x*s+s*.1,r.y*s+s*.1,s*.8,s*.8); }
  }
  for(const o of otherList()){
    const J=JOBS[o.job]||JOBS.geo;
    mg.fillStyle=J.col;
    mg.fillRect((o.x+.5)*s-s*.22,(o.y+.5)*s-s*.22,s*.44,s*.44);
  }
  for(const m of mobs){
    if(!m.alive||!seen[m.y][m.x])continue;
    mg.fillStyle=m.state==='alert'?'#ff3b3b':m.boss?'#ff8a3b':'#e05a5a';
    mg.fillRect(m.x*s+s*.2,m.y*s+s*.2,s*.6,s*.6);
  }
  mg.fillStyle='#8fd455';
  mg.beginPath();mg.arc((P.ax+.5)*s,(P.ay+.5)*s,s*.32,0,7);mg.fill();
  mg.strokeStyle='#8fd455';mg.lineWidth=2;mg.beginPath();
  mg.moveTo((P.ax+.5)*s,(P.ay+.5)*s);
  mg.lineTo((P.ax+.5+Math.sin(P.aang))*s,(P.ay+.5-Math.cos(P.aang))*s);mg.stroke();
}

function toggleBigMap(force){
  if(!bmCv)return;
  bigMapOn=(force===undefined)?!bigMapOn:force;
  $('bigMap').classList.toggle('hide',!bigMapOn);
  if(bigMapOn){buildMapLegend();drawBigMap();}
}

function buildMapLegend(){
  const items=[['#8fd455','你（箭頭=面向）'],['#a892e0','樓梯'],['#57b6ea','出口'],['#70cfff','3 層結算傳送點'],
    ['#ecc24e','鑰匙／上鎖門'],['#c98a3c','寶箱'],['#c9a8f0','商店'],['#8fe86a','NPC／怪物神殿'],
    ['#e05a5a','怪物'],['#ff3b3b','警戒中'],['#ff8a3b','頭目'],
    ['rgba(255,200,80,.5)','怪物視野'],['rgba(255,60,60,.5)','警戒視野'],['#0b0718','未探索']];
  $('bigMapLegend').innerHTML=items.map(([c,n])=>
    `<span class="li"><i class="sw" style="background:${c}"></i>${n}</span>`).join('');
}

function drawBigMap(){
  if(!bmg)return;
  const W=bmCv.width,H=bmCv.height;
  const s=Math.floor(Math.min(W/MW,H/MH));
  const ox=(W-s*MW)>>1,oy=(H-s*MH)>>1;
  bmg.imageSmoothingEnabled=false;
  bmg.fillStyle='#0b0718';bmg.fillRect(0,0,W,H);
  const eT=Math.max(2,s*.22),eB=Math.max(2,s*.16);
  const MT=CUR_TH.mini;
  let seenFloor=0,totFloor=0;
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const c=grid[y][x];
    if(c!=='W'){totFloor++;if(seen[y][x])seenFloor++;}
    if(!seen[y][x])continue;
    const X=ox+x*s,Y=oy+y*s;
    if(c==='W'){
      bmg.fillStyle=MT.wall;bmg.fillRect(X,Y,s,s);
      bmg.fillStyle=MT.hi;bmg.fillRect(X,Y,s,eT);
      bmg.fillStyle=MT.lo;bmg.fillRect(X,Y+s-eB,s,eB);
    }else if(c==='L'){
      bmg.fillStyle='#ecc24e';bmg.fillRect(X,Y,s,s);
      bmg.fillStyle='#fff0b0';bmg.fillRect(X,Y,s,eT);
      // 鎖孔記號：還沒拿鑰匙的門一眼認出
      if(!S.key){bmg.fillStyle='#3a2708';
        bmg.fillRect(X+s*.42,Y+s*.28,s*.16,s*.16);
        bmg.fillRect(X+s*.46,Y+s*.4,s*.08,s*.3);}
    }else{
      bmg.fillStyle=((x+y)&1)?MT.fA:MT.fB;bmg.fillRect(X,Y,s,s);
      bmg.fillStyle='rgba(0,0,0,.12)';bmg.fillRect(X,Y+s-1,s,1);
    }
  }
  // 怪物警戒視野
  for(const m of mobs){
    if(!m.alive||!seen[m.y]||!seen[m.y][m.x])continue;
    bmg.fillStyle=m.state==='alert'?'rgba(255,60,60,.22)':'rgba(255,200,80,.14)';
    for(const [tx,ty] of coneTiles(m))bmg.fillRect(ox+tx*s,oy+ty*s,s,s);
  }
  // 道具／NPC：直接用遊戲內精靈圖，比色塊更好認
  for(const p of props){
    if(!p.alive||!seen[p.y]||!seen[p.y][p.x])continue;
    const kind=p.t==='npc'?'npc_'+p.k:p.t;
    try{
      const sp=artOf('p',kind,0).lv[0];
      bmg.drawImage(sp,ox+p.x*s+s*.08,oy+p.y*s+s*.08,s*.84,s*.84);
    }catch(_){
      bmg.fillStyle='#c98a3c';bmg.fillRect(ox+p.x*s+s*.25,oy+p.y*s+s*.25,s*.5,s*.5);
    }
  }
  // 對手（AI 同學）
  for(const r of rivals){
    if(!r.alive||!seen[r.y]||!seen[r.y][r.x])continue;
    try{
      const sp=artOf('p','rival_'+r.k,r.chasing>0).lv[0];
      bmg.drawImage(sp,ox+r.x*s+s*.08,oy+r.y*s+s*.08,s*.84,s*.84);
    }catch(_){
      bmg.fillStyle=r.a.col;bmg.fillRect(ox+r.x*s+s*.15,oy+r.y*s+s*.15,s*.7,s*.7);
    }
    if(r.fled){bmg.strokeStyle='#ff3b3b';bmg.lineWidth=2;
      bmg.strokeRect(ox+r.x*s+1,oy+r.y*s+1,s-2,s-2);}
  }
  // 連線中的其他玩家
  for(const o of otherList()){
    const J=JOBS[o.job]||JOBS.geo;
    bmg.fillStyle=J.col;
    bmg.beginPath();bmg.arc(ox+(o.x+.5)*s,oy+(o.y+.5)*s,s*.24,0,7);bmg.fill();
  }
  // 怪物
  for(const m of mobs){
    if(!m.alive||!seen[m.y]||!seen[m.y][m.x])continue;
    try{
      const sp=artOf('mob',m.art,m.state==='alert').lv[0];
      bmg.drawImage(sp,ox+m.x*s+s*.06,oy+m.y*s+s*.06,s*.88,s*.88);
    }catch(_){
      bmg.fillStyle=m.state==='alert'?'#ff3b3b':'#e05a5a';
      bmg.fillRect(ox+m.x*s+s*.2,oy+m.y*s+s*.2,s*.6,s*.6);
    }
    if(m.boss){bmg.strokeStyle='#ff8a3b';bmg.lineWidth=2;
      bmg.strokeRect(ox+m.x*s+1,oy+m.y*s+1,s-2,s-2);}
  }
  // 拿到鑰匙後指向樓梯／出口
  if(S.key){
    const ex=props.find(o=>o.alive&&(o.t==='stair'||o.t==='exit'));
    if(ex){
      const dx=ex.x-P.x,dy=ex.y-P.y,d=Math.hypot(dx,dy);
      if(d>0.5){
        const ux=dx/d,uy=dy/d,bx=ox+(P.x+.5)*s,by=oy+(P.y+.5)*s;
        bmg.save();bmg.globalAlpha=.85;bmg.strokeStyle='#8fe86a';bmg.lineWidth=3;
        bmg.setLineDash([s*.4,s*.3]);
        bmg.beginPath();bmg.moveTo(bx,by);
        bmg.lineTo(ox+(ex.x+.5)*s,oy+(ex.y+.5)*s);bmg.stroke();bmg.restore();
      }
    }
  }
  // 玩家：視野扇形＋方向箭頭
  const pxx=ox+(P.ax+.5)*s,pyy=oy+(P.ay+.5)*s;
  bmg.save();
  bmg.translate(pxx,pyy);bmg.rotate(P.aang-Math.PI/2);
  bmg.fillStyle='rgba(255,227,138,.12)';
  bmg.beginPath();bmg.moveTo(0,0);bmg.arc(0,0,s*3.4,-.5,.5);bmg.closePath();bmg.fill();
  bmg.fillStyle='#8fd455';bmg.strokeStyle='#07050f';bmg.lineWidth=2;
  bmg.beginPath();
  bmg.moveTo(s*.42,0);bmg.lineTo(-s*.3,-s*.3);bmg.lineTo(-s*.14,0);bmg.lineTo(-s*.3,s*.3);
  bmg.closePath();bmg.fill();bmg.stroke();
  bmg.restore();
  $('bigMapPct').textContent='探索 '+Math.round(seenFloor/Math.max(1,totFloor)*100)+'%　'+$('floorTag').textContent;
}

function loop(){if(!running)return;render();drawMini();if(bigMapOn)drawBigMap();requestAnimationFrame(loop);}

function winGame(){
  const Z=zoneOf(), zi=S.zone||0;
  markRebirthFloor(Z.floors,zi);
  const first=(S.cleared===undefined||S.cleared<zi);
  classroomPendingClear={zoneClears:1,firstClear:first,title:Z.n+'通關'};
  classroomCheckpoint('zone_clear');
  if(first) S.cleared=zi;
  // 紀錄最佳
  S.zoneBest=S.zoneBest||{};
  const best=S.zoneBest[Z.k];
  const cur={floor:Z.floors,chain:Math.max(...(S.allChains||[0]),0),turns:turnNo};
  if(!best||cur.chain>best.chain) S.zoneBest[Z.k]=cur;
  S.zoneProgress=S.zoneProgress||{};S.zoneProgress[Z.k]=0;
  const teacherClue=grantTeacherClue(zi);
  const finalTeacher=zi===5&&hiddenTeacherReady()&&!(S.meta&&S.meta.hiddenEnding);
  saveChar();
  const nextZ=ZONES[zi+1];
  overlay(`<div class="kicker">ZONE CLEAR</div><h1 style="color:${Z.col}">${Z.ic} ${Z.n} 通關！</h1>
    <div class="rank" style="color:${Z.col};border-color:${Z.col}">
      ${Z.floors} 層 · 第 ${turnNo} 回合 · 最長連擊 ${cur.chain}</div>
    <div class="desc">
      Lv.${S.lv}　牌組 ${S.deck.length} 張　寶石 ${S.gems.length} 顆<br>
      ${first&&nextZ?`<br><b style="color:${nextZ.col}">🔓 新區域開啟：${nextZ.ic} ${nextZ.n}（${nextZ.floors} 層）</b><br>
        解鎖新卡牌 ${nextZ.cards.length} 種${nextZ.gems.length?'、新寶石 '+nextZ.gems.length+' 種':''}`
        :first?'<br><b>🏆 六大區域全數通關！</b>':'（本區已通關過，這次是複習）'}
      <div class="teacher-clue-award"><b>📜 ${hesc(teacherClue.title)}</b><span>${hesc(teacherClue.text)}</span>${teacherClue.card?`<em>獲得：${hesc(CARDS[teacherClue.card].n)}</em>`:''}</div>
    </div>
    <button class="go" id="ok">${finalTeacher?'開啟最後隱藏樓層':'記錄成績'}</button>`,()=>finalTeacher?hiddenTeacherGate():nameEntry(true));
}

function resetRun(){
  const keepName=S.name, keepJob=S.job;
  // meta（知識點／傳承／圖鑑／收集）必須跨輪迴保留，不能被 Object.assign 洗掉
  const keepMeta=S.meta||{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}};
  const keepCleared=(S.cleared===undefined?-1:S.cleared);
  const keepBest=S.zoneBest||{};
  const keepProgress=S.zoneProgress||{};
  const keepExt=S.extAbil||{};
  Object.assign(S,{hp:100,maxhp:100,lv:1,xp:0,xpNeed:3,
    deck:mkDeck(['knife','knife','dagger','blank','clock','wand','wand','garlic','whip','imelda']),
    gems:[],dmgMul:1,step:.35,handSize:5,armor:0,key:false,mana:6,tomes:0,handCap:5,chant:false,allChains:[],gold:0,ups:{},name:'',job:'',pot:{heal:1,elixir:0,freeze:0,firebomb:0,luck:0,medkit:0},luckChest:0,shrineUses:{},waypointRunUses:{},wrong:[],found:[],zone:0,cleared:keepCleared,zoneBest:keepBest,zoneProgress:keepProgress,meta:keepMeta,extAbil:keepExt});
  quizStats={ok:0,total:0,points:0};
  if(keepJob&&JOBS[keepJob]){ S.name=keepName;S.job=keepJob;S.deck=mkDeck(JOBS[keepJob].deck);
    S.handSize=5; }
  // ── 輪迴傳承：只有【玩家選定的傳說卡】跟著下一輪，其餘歸回起始牌組 ──
  //    （全帶反而會稀釋費用曲線，所以設可攜上限並讓玩家自選）
  const owned=((S.meta&&S.meta.legendary)||[]).filter(id=>CARDS[id]);
  const cap=legacyCap();
  let picked=((S.meta&&S.meta.legacyPick)||[]).filter(id=>owned.includes(id)).slice(0,cap);
  if(!picked.length&&owned.length){                 // 沒選過就自動挑低費的
    picked=owned.slice().sort((a,b)=>(CARDS[a].wild?0:CARDS[a].c)-(CARDS[b].wild?0:CARDS[b].c)).slice(0,cap);
  }
  for(const id of picked) S.deck.push({id,gem:null});
  // 等級歸 1 → 生命與魔力回到起點，再套用輪迴永久強化
  S.lv=1; S.xp=0; S.xpNeed=3; S.maxhp=100; S.mana=6;
  // 套用輪迴的永久強化
  S.maxhp+=metaVal('vit');
  S.armor+=metaVal('purse');
  S.pot.heal=(S.pot.heal||0)+metaVal('flask');
  S.dmgMul+=metaVal('sharp');
  /* 通用之識改為增強回魔，不再增加通用卡張數；全牌組上限固定 2 張。 */
  // 外部匯入角色的加成也要納入，最後才補滿血
  if(S.extAbil&&S.extAbil.maxhp) S.maxhp+=S.extAbil.maxhp;
  S.hp=S.maxhp;                    // ← 一律以最終上限補滿
  S.deck=sanitizeDeck(S.deck,S.job);
  saveChar();
}

function reset(){
  delete S.runOver;
  resetRun();
  loadFloor(0);backToDungeon();
}

function introScreen(){
 const M=S.meta||{};
 const zoneN=(S.cleared===undefined?-1:S.cleared)+1;
  overlay(`<div class="kicker">MATH DUNGEON</div>
  <h1>地城連擊</h1>
  <div class="verTag">v2.0 · 龍岡國中校園</div>
  ${classroomCardHtml()}
  <div class="homecard">
    ${S.job
      ? `<div class="hc1" style="color:${JOBS[S.job].col}">${JOBS[S.job].ic} ${S.name||'無名'}</div>
         <div class="hc2">${JOBS[S.job].n}　Lv.${S.lv}　◉ ${S.gold}</div>
         <div class="hc3">通關 ${zoneN}/${ZONES.length} 區　✦ ${M.souls||0} 知識點</div>`
      : `<div class="hc1" style="color:#a99ec9">尚未建立角色</div>
         <div class="hc3">進入後選擇區域，自行探索。</div>`}
  </div>
  <div class="dungeon-wellbeing" role="note" aria-label="健康學習提醒"><i>🌿</i><span>適度學習、記得休息與戶外活動。</span></div>
  <button class="go" id="ok">⚔ 進入地城・自行探索</button>
  <button class="go" id="menuOpen" style="background:linear-gradient(180deg,#8a7ab8,#5a4a86);border-color:#3a2c60">
    ☰ 選單${(S.wrong||[]).length?'　<span class="mgDot">'+(S.wrong||[]).length+'</span>':''}</button>
  ${classroomLaunch?'<button class="go" id="classroomReturn" style="background:linear-gradient(180deg,#4f8f70,#2d6147);border-color:#183d2a">🏫 回到班級系統</button>':''}`,
  ()=>{saveChar();campusScreen();},el=>{
    if(el.id==='menuOpen'){ setTimeout(menuScreen,10); return true; }
    if(el.id==='classroomReturn'){ classroomReturn(); return true; }
    return false;
  });
}

function menuScreen(){
  const M=S.meta||{};
  const g=(title,items)=>`<div class="mgTitle">${title}</div>
    <div class="mgGrid">${items.map(([id,ic,label,note])=>
      `<span class="mgItem" id="${id}"><i>${ic}</i><b>${label}</b>
        ${note?`<em>${note}</em>`:''}</span>`).join('')}</div>`;
  overlay(`<div class="kicker">MENU</div><h1>選單</h1>
    <div id="menuWrap">
      ${g('學習與收藏',[
        ['reviewOpen','📚','課後複習',(S.wrong||[]).length?(S.wrong||[]).length+' 題錯題':'練習與複習'],
        ['codexOpen','📖','學習圖鑑',''],
        ['petDexOpen','🐾','完整寵物圖鑑',Object.keys(FOES).length+' 種'],
        ['logOpen','📊','學習日誌',M.totalQ?M.totalQ+' 題':''],
      ].concat(classroomLaunch?[]:[['impOpen','📥','匯入題庫',QBANK.length+' 題']]))}
      ${g('排行榜',[
        ['boardOpen','🏅','排行榜',''],
      ])}
    </div>
    <button class="go" id="ok">返回</button>`,introScreen,el=>{
    const it=el.closest('.mgItem'); if(!it) return false;
    const id=it.id;
    const go=fn=>{ setTimeout(fn,10); return true; };
    if(id==='impOpen') return go(importScreen);
    if(id==='charOpen') return go(classroomLaunch?classroomRoleScreen:charScreen);
    if(id==='charExp') return go(exportChar);
    if(id==='charImp') return go(()=>charImportScreen());
    if(id==='partyOpen') return go(()=>partyScreen());
    if(id==='netOpen') return go(()=>netScreen());
    if(id==='aiOpen') return go(aiScreen);
    if(id==='questOpen') return go(questScreen);
    if(id==='zoneOpen') return go(()=>campusScreen());
    if(id==='boardOpen') return go(boardOnly);
    if(id==='metaOpen') return go(()=>metaScreen());
    if(id==='codexOpen') return go(()=>codexScreen('npc'));
    if(id==='petDexOpen') return go(()=>petCodexScreen('all'));
    if(id==='reviewOpen') return go(reviewScreen);
    if(id==='logOpen') return go(logScreen);
    if(id==='bridgeOpen') return go(()=>bridgeScreen());
    if(id==='setDiff') return go(diffScreen);
    if(id==='setVol') return go(volScreen);
    return false;
  });
}

function classroomRoleScreen(){
  const c=classroomLaunch&&classroomLaunch.character||{},w=c.weapon||{};
  overlay(`<div class="kicker">CLASS HERO</div><h1>班級角色已自動帶入</h1><div class="rank">${hesc(c.name||S.name)}・${hesc(c.classJob||JOBS[S.job].n)}・Lv.${Number(c.classLevel)||1}</div><div class="desc">地下城會依班級職業自動套用戰鬥方式，學生不需要匯入 JSON，也不會在這裡改掉班級職業。<br><br>第一人稱武器：<b>${hesc(w.name||'新手武器')}</b><br>本次題庫：<b>${(classroomLaunch.questionBank||[]).length||'地下城內建'}${(classroomLaunch.questionBank||[]).length?' 題':''}</b></div><button class="go" id="ok">返回選單</button>`,menuScreen);
}

function diffScreen(){
  overlay(`<div class="kicker">SETTING</div><h1>難度</h1>
    <div class="desc" style="margin-bottom:8px">影響敵人血量與援軍抵達速度，不影響題目難度。無論選項為何，高樓層都會逐層提高生命與攻擊，需要透過輪迴神殿累積永久強化。</div>
    <div id="rvlist">${Object.keys(DIFFS).map(k=>
      `<div class="rvrow${diff===k?' on':''}" data-d="${k}">
        <div class="rvi" style="background:#4a3b7333;color:#cbbde8">${k==='easy'?'🌱':k==='hard'?'🔥':'⚖'}</div>
        <div class="rvinfo"><div class="rvn">${DIFFS[k].n}${diff===k?'　✓ 目前':''}</div>
        <div class="rvd">敵人血量 ×${DIFFS[k].hp}　攻擊 ×${DIFFS[k].atk}　援軍每 ${(DIFFS[k].ms/1000).toFixed(1)} 秒推進</div>
        </div></div>`).join('')}</div>
    <button class="go" id="ok">返回</button>`,menuScreen,el=>{
      const row=el.closest('.rvrow'); if(!row)return false;
      diff=row.dataset.d; saveChar();
      setTimeout(menuScreen,10); return true;
    });
}

function volScreen(){
  const opts=['auto',1,2,3,4,5,6];
  overlay(`<div class="kicker">SETTING</div><h1>出題範圍</h1>
    <div class="desc" style="margin-bottom:8px">
      「依樓層」會按你所在區域自動選冊；也可以鎖定某一冊集中練習。</div>
    <div id="rvlist">${opts.map(v=>
      `<div class="rvrow${volPick===v?' on':''}" data-v="${v}">
        <div class="rvi" style="background:#4a3b7333;color:#cbbde8">${v==='auto'?'⟳':v}</div>
        <div class="rvinfo"><div class="rvn">${v==='auto'?'依樓層自動':'第 '+v+' 冊'}${volPick===v?'　✓ 目前':''}</div>
        </div></div>`).join('')}</div>
    <button class="go" id="ok">返回</button>`,menuScreen,el=>{
      const row=el.closest('.rvrow'); if(!row)return false;
      const v=row.dataset.v;
      volPick=(v==='auto')?'auto':+v; saveChar();
      setTimeout(menuScreen,10); return true;
    });
}
