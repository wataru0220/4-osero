// 4-player Othello - GREEDY CPU headless run (JScript/ES3, run via cscript)
// Mirrors the HTML game: 2-pieces-each pinwheel opening + opening (first 4 turns) anti-wipeout protection.
// Verifies: no player is annihilated during the opening, termination, and score integrity.

var SIZE = 10;
var DIRS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

function newBoard(){
  var b = [];
  for(var r=0;r<SIZE;r++){ b[r]=[]; for(var c=0;c<SIZE;c++) b[r][c]=0; }
  // each player 2 pieces, 90-degree rotational pinwheel (same as HTML)
  b[4][4]=1; b[3][4]=1;   // P1 black (center + up)
  b[4][5]=2; b[4][6]=2;   // P2 blue  (center + right)
  b[5][5]=3; b[6][5]=3;   // P3 red   (center + down)
  b[5][4]=4; b[5][3]=4;   // P4 white (center + left)
  return b;
}

// raw geometric flips
function getFlippable(board,row,col,pid){
  if(board[row][col]!==0) return [];
  var out=[];
  for(var d=0;d<DIRS.length;d++){
    var dr=DIRS[d][0], dc=DIRS[d][1];
    var line=[]; var r=row+dr, c=col+dc;
    while(r>=0&&r<SIZE&&c>=0&&c<SIZE&&board[r][c]!==0&&board[r][c]!==pid){
      line.push([r,c]); r+=dr; c+=dc;
    }
    if(line.length>0 && r>=0&&r<SIZE&&c>=0&&c<SIZE && board[r][c]===pid){
      for(var i=0;i<line.length;i++) out.push(line[i]);
    }
  }
  return out;
}

function counts(board){
  var ct=[0,0,0,0];
  for(var r=0;r<SIZE;r++) for(var c=0;c<SIZE;c++){
    var v=board[r][c]; if(v>=1&&v<=4) ct[v-1]++;
  }
  return ct;
}

// flips actually applied; when protect=true, no color is reduced to 0 (keep its last piece)
function computeFlips(board,row,col,pid,protect){
  var raw=getFlippable(board,row,col,pid);
  if(!protect || raw.length===0) return raw;
  var total=counts(board); // index 0..3 -> color 1..4
  var byOwnerCount={}; // color -> how many of its cells are in raw
  var i;
  for(i=0;i<raw.length;i++){ var v=board[raw[i][0]][raw[i][1]]; byOwnerCount[v]=(byOwnerCount[v]||0)+1; }
  var keptOf={}; // color -> already protected one?
  var out=[];
  for(i=0;i<raw.length;i++){
    var color=board[raw[i][0]][raw[i][1]];
    var wipes = (total[color-1]-byOwnerCount[color]===0);
    if(wipes && !keptOf[color]){
      // protect exactly one (the last occurrence) of this color: skip the LAST one
      // find if this is the last index of that color
      var isLast=true;
      for(var j=i+1;j<raw.length;j++){ if(board[raw[j][0]][raw[j][1]]===color){ isLast=false; break; } }
      if(isLast){ keptOf[color]=true; continue; } // skip -> stays unflipped
    }
    out.push(raw[i]);
  }
  return out;
}

function getValidMoves(board,pid,protect){
  var moves=[];
  for(var r=0;r<SIZE;r++) for(var c=0;c<SIZE;c++){
    if(board[r][c]!==0) continue;
    if(computeFlips(board,r,c,pid,protect).length>0) moves.push([r,c]);
  }
  return moves;
}

// GREEDY: pick the move that flips the most pieces; ties broken randomly.
function greedyChoice(board,pid,protect){
  var moves=getValidMoves(board,pid,protect);
  if(moves.length===0) return null;
  var best=-1, bestList=[];
  for(var i=0;i<moves.length;i++){
    var g=computeFlips(board,moves[i][0],moves[i][1],pid,protect).length;
    if(g>best){ best=g; bestList=[moves[i]]; }
    else if(g===best){ bestList.push(moves[i]); }
  }
  return bestList[Math.floor(Math.random()*bestList.length)];
}

function isFull(board){
  for(var r=0;r<SIZE;r++) for(var c=0;c<SIZE;c++) if(board[r][c]===0) return false;
  return true;
}

// Play one game. trace=true logs first few moves. Returns stats incl. piece counts right after the first 4 turns.
function playGame(trace){
  var board=newBoard();
  var cur=0, consecPass=0, turn=0, totalPasses=0, placed=0;
  var guard=0;
  var openingCounts=null; // snapshot after the first 4 turns (the opening round)
  while(true){
    if(turn>=4 && openingCounts===null) openingCounts=counts(board);
    guard++; if(guard>100000){ WScript.Echo("!! GUARD TRIPPED - possible infinite loop"); break; }
    if(isFull(board)) break;
    var protect = (turn < 4); // first 4 turns protected, matches HTML turnCount<=4
    var pid=cur+1;
    var mv=greedyChoice(board,pid,protect);
    if(mv===null){
      consecPass++; totalPasses++;
      if(consecPass>=4) break;
    } else {
      consecPass=0;
      var flip=computeFlips(board,mv[0],mv[1],pid,protect);
      board[mv[0]][mv[1]]=pid;
      for(var k=0;k<flip.length;k++) board[flip[k][0]][flip[k][1]]=pid;
      placed++;
      if(trace && placed<=6){
        WScript.Echo("  move"+placed+": P"+pid+" -> ("+mv[0]+","+mv[1]+")  flips "+flip.length);
      }
    }
    turn++;
    cur=(cur+1)%4;
  }
  if(openingCounts===null) openingCounts=counts(board);
  var ct=counts(board);
  var max=Math.max(ct[0],ct[1],ct[2],ct[3]);
  var winners=[];
  for(var w=0;w<4;w++) if(ct[w]===max) winners.push(w+1);
  var openMin=Math.min(openingCounts[0],openingCounts[1],openingCounts[2],openingCounts[3]);
  return { counts:ct, winners:winners, turns:turn, passes:totalPasses, placed:placed,
           total:ct[0]+ct[1]+ct[2]+ct[3], full:isFull(board),
           openingCounts:openingCounts, openMin:openMin };
}

function f1(x){ return (Math.round(x*10)/10); }

// ---- RUN ----
WScript.Echo("=== Sample game opening trace (4 greedy CPUs, 2-piece pinwheel start) ===");
var sample=playGame(true);
WScript.Echo("  counts right after first 4 turns: P1="+sample.openingCounts[0]+" P2="+sample.openingCounts[1]+
             " P3="+sample.openingCounts[2]+" P4="+sample.openingCounts[3]+"  (all should be >=1)");
WScript.Echo("  ... game over");
WScript.Echo("  final score  P1(black)="+sample.counts[0]+" P2(blue)="+sample.counts[1]+
             " P3(red)="+sample.counts[2]+" P4(white)="+sample.counts[3]);
WScript.Echo("  totalPieces="+sample.total+"  placed="+sample.placed+
             "  turns="+sample.turns+"  passes="+sample.passes+"  boardFull="+sample.full);
WScript.Echo("  winner=P"+sample.winners.join(",P"));
WScript.Echo("");

var N=500;
WScript.Echo("=== "+N+" consecutive greedy-vs-greedy games ===");
var wins=[0,0,0,0], sumScore=[0,0,0,0], draws=0, fullCount=0, sumPlaced=0;
var minTotal=9999, maxTurns=0, integrityFail=0;
var openingWipeouts=0; // games where someone had 0 pieces after the opening round
for(var g=0; g<N; g++){
  var res=playGame(false);
  if(res.total!==res.placed+8){ integrityFail++; } // started with 8 pieces now
  if(res.openMin<1) openingWipeouts++;
  if(res.total<minTotal) minTotal=res.total;
  if(res.turns>maxTurns) maxTurns=res.turns;
  for(var p=0;p<4;p++) sumScore[p]+=res.counts[p];
  if(res.winners.length>1) draws++;
  for(var x=0;x<res.winners.length;x++) wins[res.winners[x]-1]++;
  if(res.full) fullCount++;
  sumPlaced+=res.placed;
}
WScript.Echo("  >>> OPENING WIPEOUTS (0 pieces after first 4 turns): "+openingWipeouts+" / "+N+"   (target: 0)");
WScript.Echo("  wins (joint winners counted): P1="+wins[0]+" P2="+wins[1]+" P3="+wins[2]+" P4="+wins[3]);
WScript.Echo("  draw games: "+draws+" / "+N);
WScript.Echo("  avg score: P1="+f1(sumScore[0]/N)+" P2="+f1(sumScore[1]/N)+
             " P3="+f1(sumScore[2]/N)+" P4="+f1(sumScore[3]/N));
WScript.Echo("  ended by full board: "+fullCount+" / "+N+"   avg placed="+f1(sumPlaced/N));
WScript.Echo("  minTotalPieces="+minTotal+" (>=8 means integrity ok)  maxTurns="+maxTurns+" (<100000 means no infinite loop)");
WScript.Echo("  integrity failures: "+integrityFail);
WScript.Echo("");
WScript.Echo("=== RUN COMPLETE ===");
