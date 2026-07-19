export class MusicPlayerService {
  constructor({bus,store}) {
    this.bus=bus; this.store=store; this.queue=[]; this.index=-1;
    this.audio=new Audio(); this.audio.preload='metadata'; this.audio.volume=.8;
    store.set('musicPlayer',{visible:false,playing:false,current:null,currentTime:0,duration:0,volume:.8,repeat:false});
    this.audio.addEventListener('play',()=>this.sync());
    this.audio.addEventListener('pause',()=>this.sync());
    this.audio.addEventListener('timeupdate',()=>this.progress());
    this.audio.addEventListener('loadedmetadata',()=>this.progress());
    this.audio.addEventListener('ended',()=>this.next());
    this.audio.addEventListener('error',()=>bus.emit('music:error',{message:'WireVault could not play this track.'}));
  }
  current(){return this.queue[this.index]||null}
  playTrack(track,queue=[]){
    this.queue=queue.length?[...queue]:[track];
    this.index=Math.max(0,this.queue.findIndex(x=>x.id===track.id));
    this.load(true);
  }
  load(autoplay=false){
    const track=this.current(); if(!track)return;
    const url=track.stream_url||track.url||(track.path?`/api/media/file?path=${encodeURIComponent(track.path)}`:'');
    this.store.set('musicPlayer.visible',true);
    this.store.set('musicPlayer.current',track);
    if(!url){this.bus.emit('music:error',{message:'This track has no playable file path.'});return}
    this.audio.src=url; this.audio.load();
    if(autoplay)this.audio.play().catch(e=>this.bus.emit('music:error',{message:e.message}));
    this.bus.emit('music:track-changed',{track,index:this.index}); this.sync();
  }
  async toggle(){if(!this.current())return; if(this.audio.paused)await this.audio.play().catch(e=>this.bus.emit('music:error',{message:e.message})); else this.audio.pause()}
  next(){if(!this.queue.length)return; if(this.index>=this.queue.length-1){if(!this.store.get('musicPlayer.repeat')){this.audio.pause();return}this.index=0}else this.index++; this.load(true)}
  previous(){if(!this.queue.length)return; if(this.audio.currentTime>4){this.audio.currentTime=0;return} this.index=this.index<=0?this.queue.length-1:this.index-1; this.load(true)}
  seek(seconds){if(Number.isFinite(seconds))this.audio.currentTime=Math.max(0,Math.min(seconds,this.audio.duration||seconds))}
  setVolume(v){v=Math.max(0,Math.min(1,Number(v)));this.audio.volume=v;this.store.set('musicPlayer.volume',v)}
  toggleRepeat(){const v=!this.store.get('musicPlayer.repeat');this.store.set('musicPlayer.repeat',v);return v}
  stop(){this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.queue=[];this.index=-1;this.store.set('musicPlayer.visible',false);this.store.set('musicPlayer.current',null);this.store.set('musicPlayer.playing',false);this.bus.emit('music:stopped')}
  sync(){this.store.set('musicPlayer.playing',!this.audio.paused);this.store.set('musicPlayer.current',this.current());this.bus.emit('music:state',this.store.get('musicPlayer'))}
  progress(){this.store.set('musicPlayer.currentTime',this.audio.currentTime||0);this.store.set('musicPlayer.duration',Number.isFinite(this.audio.duration)?this.audio.duration:0);this.bus.emit('music:progress',{})}
}