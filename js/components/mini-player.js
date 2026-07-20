import {wvIcon} from './wv-icon.js?v=1.5.3';
const fmt=s=>{s=Number.isFinite(s)?Math.max(0,s):0;return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`};
export function createMiniPlayer({player,store,bus}){
  const shell=document.createElement('section');shell.id='miniMusicPlayer';shell.className='mini-player hidden';
  const art=document.createElement('div');art.className='mini-player-art';art.append(wvIcon('music','mini-player-icon'));
  const copy=document.createElement('div');copy.className='mini-player-copy';
  const title=document.createElement('strong'),sub=document.createElement('small');
  const line=document.createElement('div');line.className='mini-player-timeline';
  const progress=document.createElement('input');progress.type='range';progress.min=0;progress.max=100;progress.step=.1;progress.className='mini-player-progress focusable';
  const time=document.createElement('span');time.className='mini-player-time';line.append(progress,time);copy.append(title,sub,line);
  const controls=document.createElement('div');controls.className='mini-player-controls';
  const button=(text,label)=>{const b=document.createElement('button');b.className='mini-player-button focusable';b.type='button';b.textContent=text;b.title=label;return b};
  const prev=button('◀','Previous'),play=button('▶','Play or pause'),next=button('▶','Next'),repeat=button('↻','Repeat'),close=button('×','Stop');
  play.classList.add('mini-player-play');close.classList.add('mini-player-close');
  const vol=document.createElement('input');vol.type='range';vol.min=0;vol.max=1;vol.step=.05;vol.value=.8;vol.className='mini-player-volume focusable';
  controls.append(prev,play,next,repeat,vol,close);shell.append(art,copy,controls);
  prev.onclick=()=>player.previous();play.onclick=()=>player.toggle();next.onclick=()=>player.next();repeat.onclick=()=>repeat.classList.toggle('active',player.toggleRepeat());close.onclick=()=>player.stop();
  progress.oninput=()=>{const s=store.get('musicPlayer');if(s.duration)player.seek(Number(progress.value)/100*s.duration)};
  vol.oninput=()=>player.setVolume(vol.value);
  function render(){const s=store.get('musicPlayer'),t=s.current;shell.classList.toggle('hidden',!s.visible);document.body.classList.toggle('mini-player-visible',!!s.visible);if(!t)return;title.textContent=t.name||t.title||'Unknown Track';sub.textContent=t.artist||t.album||t.extension?.toUpperCase()||'Indexed Music';play.textContent=s.playing?'❚❚':'▶';repeat.classList.toggle('active',!!s.repeat);vol.value=s.volume??.8;progress.value=s.duration?String(s.currentTime/s.duration*100):'0';time.textContent=`${fmt(s.currentTime)} / ${fmt(s.duration)}`;}
  bus.on('state:changed',x=>{if(x.path.startsWith('musicPlayer'))render()});bus.on('music:progress',render);bus.on('music:track-changed',render);bus.on('music:stopped',render);render();return shell;
}