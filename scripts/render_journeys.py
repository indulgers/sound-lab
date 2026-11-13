#!/usr/bin/env python3
"""Sound Cocktail V3.2: reproducible original ambient stems.

The first 2m40s of Chiang Mai, Bali and Da Lat retain the V3.1 sound,
with a gentle transition into a newly composed long-form continuation.
Music and nature beds are synthetic sketches; no field recording or
traditional instrument performance is claimed.
"""
from __future__ import annotations
import gc, json, math, subprocess, time, os
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'public'/'assets'/'audio'/'journeys'
OLD = ROOT/'public'/'assets'/'audio'/'scenes'
SR = 24_000
DURATION = 15*60
N = SR*DURATION
STEMS = ('harmony','details','atmosphere')

# Each destination has its own harmonic palette, movement and soundscape density.
SCENES = {
 'chiang-mai': dict(title='清迈 · 花园咖啡馆', mood='专注 / 写作', seed=13, style='cafe',
   chords=[[50,57,61,64],[47,54,57,62],[43,50,54,59],[45,52,57,62],
           [50,57,59,64],[52,57,61,66],[43,50,57,62],[45,52,59,64]],
   scene_rms=(.034,.010,.0025), chord_sec=41, lead_sec=19, palette=[69,71,73,74,76,78,81],
   moments=['花园开门','暖色琴键','树影摇动','一封未写完的信','回到第一杯咖啡']),
 'bali': dict(title='乌布 · 颂钵长廊', mood='冥想 / 放松', seed=37, style='bowl',
   chords=[[50,57,60,65],[46,53,57,62],[48,55,60,64],[43,50,57,62],
           [50,57,60,64],[45,52,57,60]],
   scene_rms=(.032,.009,.0018), chord_sec=67, lead_sec=36, palette=[50,53,55,57,60,62,65],
   moments=['木门后的安静','第一道回响','光落在地面','更深的留白','余音慢慢退去']),
 'da-lat': dict(title='大叻 · 晨雾与咖啡', mood='阅读 / 慢下来', seed=63, style='mist',
   chords=[[50,57,61,66],[43,50,57,62],[47,54,57,62],[45,52,59,64],
           [50,57,61,64],[48,55,59,64]],
   scene_rms=(.031,.009,.0025), chord_sec=53, lead_sec=25, palette=[62,64,66,69,71,73,74],
   moments=['山谷刚醒','杯口的热气','雾慢慢散开','窗前的一页书','山间渐渐明亮']),
 'kyoto': dict(title='京都 · 雨中的茶室', mood='静心 / 呼吸', seed=89, style='tea',
   chords=[[48,55,59,64],[45,52,57,60],[41,48,55,59],[43,50,57,62],
           [48,55,59,62],[45,52,57,64]],
   scene_rms=(.021,.006,.0038), chord_sec=69, lead_sec=42, palette=[60,62,64,67,69,71,72],
   moments=['推开障子门','屋檐下的雨','庭院的苔','茶水将凉','雨仍在下']),
 'lisbon': dict(title='里斯本 · 午后的金光', mood='灵感 / 创作', seed=113, style='sun',
   chords=[[53,60,64,69],[48,55,60,64],[50,57,60,65],[46,53,58,62],
           [53,60,65,69],[55,60,64,71],[48,55,59,64]],
   scene_rms=(.032,.012,.0019), chord_sec=37, lead_sec=13, palette=[65,67,69,72,74,76,77,79],
   moments=['阳光斜进窗','远处的脚步','旋律经过街角','写作刚刚开始','落在桌面的余晖']),
 'hoi-an': dict(title='会安 · 灯笼与河水', mood='舒缓 / 独处', seed=157, style='lantern',
   chords=[[52,59,62,67],[48,55,59,64],[43,50,55,59],[45,52,57,62],
           [52,59,64,67],[50,57,62,66]],
   scene_rms=(.029,.009,.003), chord_sec=58, lead_sec=26, palette=[64,66,67,69,71,74,76],
   moments=['灯笼初亮','桥下有水声','街道变安静','晚风吹过木窗','河面只剩余光'])
}

def note_freq(m):return np.float32(440*2**((m-69)/12))

def write_audio(filename, audio, br='80k'):
    f=OUT/filename; f.parent.mkdir(parents=True,exist_ok=True)
    p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','f32le','-ar',str(SR),'-ac','2',
       '-i','pipe:0','-acodec','libmp3lame','-b:a',br,'-ar',str(SR),str(f)],
       input=np.asarray(audio,dtype='<f4').tobytes(),stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(p.stderr.decode())
    return f.stat().st_size

def decode_old(scene, name):
    old_file = {'chiang-mai':'chiang-mai','bali':'bali','da-lat':'da-lat'}.get(scene)
    if not old_file:return None
    p=(OLD if scene in ('chiang-mai','bali') else OUT)/f'{scene}-{name}.mp3'
    if not p.exists():return None
    q=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(p),'-t','180',
       '-ac','2','-ar',str(SR),'-f','f32le','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
    a=np.frombuffer(q.stdout,dtype='<f4').reshape(-1,2).copy()
    return a[:min(len(a),180*SR)]

def pad_voice(note,start,duration,amp,pan,style,seed):
    offset=int(start*SR); length=min(int(duration*SR), N-offset)
    if length<=0:return offset,np.zeros((0,2),dtype='f4')
    rng=np.random.default_rng(seed)
    t=np.arange(length,dtype='f4')/SR
    f=note_freq(note)
    drift=(.005 if style=='bowl' else .012)*np.sin(2*np.pi*t/(11+seed%7))
    # Gentle harmonic swells; controlled second/third partials rather than sharp saws.
    phase=2*np.pi*f*t+drift
    if style=='tea': overt=(.105,.025)
    elif style=='bowl': overt=(.18,.055)
    elif style=='sun': overt=(.145,.045)
    else: overt=(.13,.035)
    sig=(np.sin(phase)+overt[0]*np.sin(2*phase+.27)+overt[1]*np.sin(3*phase+.51)).astype('f4')
    t_in=5.5 if style!='bowl' else 9.
    t_out=14. if style!='bowl' else 20.
    env=np.minimum(1., t/t_in)*np.minimum(1., (duration-t)/t_out)
    env=np.clip(env,0,1)
    trem=.96+.04*np.sin(2*np.pi*t/(23.+seed%13)+rng.random())
    sig*=env*trem*amp
    return offset,np.column_stack((sig*np.sqrt((1-pan)/2),sig*np.sqrt((1+pan)/2))).astype('f4')

def pluck(note,start,amp,pan,style,seed, duration=5.):
    offset=int(start*SR);length=min(int(duration*SR),N-offset)
    if length<=0:return offset,np.zeros((0,2),dtype='f4')
    rng=np.random.default_rng(seed)
    t=np.arange(length,dtype='f4')/SR
    f=note_freq(note)
    # Multiple decaying resonances + muted pick attack. No externally licensed samples.
    spec={'cafe':[(1,1.,1.5),(2,.31,.58),(3,.13,.30),(4,.05,.20)],
          'mist':[(1,1.,2.6),(2,.18,.75),(3,.07,.47)],
          'tea':[(1,1.,2.7),(2,.20,.9),(3,.08,.52)],
          'sun':[(1,.95,1.5),(2,.36,.61),(3,.18,.32),(4,.07,.22)],
          'lantern':[(1,1.,2.2),(2,.29,.82),(3,.11,.45)]}.get(style,[(1,1.,2.)])
    sig=np.zeros(length,dtype='f4')
    for h,w,decay in spec:
        p=.02*np.sin(2*np.pi*t/(7.+(seed%5)))
        sig+=(w*np.sin(2*np.pi*f*h*t+p+.19*h)*np.exp(-t/decay)).astype('f4')
    burst=rng.standard_normal(length,dtype='f4')
    sos=butter(1,2400 if style!='tea' else 1400,fs=SR,output='sos')
    burst=sosfilt(sos,burst).astype('f4')
    sig+=burst*np.exp(-t/.014).astype('f4')*.11
    envelope=(1-np.exp(-t/.012))*np.minimum(1,(duration-t)/.2)
    sig*=envelope*amp
    return offset,np.column_stack((sig*np.sqrt((1-pan)/2),sig*np.sqrt((1+pan)/2))).astype('f4')

def bowl(note,start,amp,pan,seed):
    offset=int(start*SR);length=min(int(18.*SR),N-offset)
    t=np.arange(length,dtype='f4')/SR
    f=note_freq(note)
    # Inharmonic modal resonance and slow beat frequency imitate but do not claim a real singing bowl.
    modes=[(1.,1.,9.5),(2.017,.24,6.5),(2.94,.17,5.2),(3.83,.09,3.4),(5.52,.052,2.2)]
    sig=np.zeros(length,dtype='f4')
    for i,(ratio,weight,decay) in enumerate(modes):
        detune=1+.0012*np.sin(2*np.pi*t/(5.8+i*1.6))
        phase=2*np.pi*f*ratio*t*detune+(i*.2)
        sig+=weight*np.sin(phase).astype('f4')*np.exp(-t/decay).astype('f4')
    e=np.minimum(1,t/.09)*(1-np.exp(-(18-t)/.12))
    sig*=e*amp
    return offset,np.column_stack((sig*np.sqrt((1-pan)/2),sig*np.sqrt((1+pan)/2))).astype('f4')

def put(dest,event):
    at,sig=event
    dest[at:at+len(sig),:]+=sig

def blur_room(a,style):
    # Very light stereo diffusion; keep it warm, don't wash out note identity.
    delays={'bowl':[(.081,.16),(.137,.115),(.287,.083),(.533,.05),(.79,.038)],
            'tea':[(.053,.09),(.179,.065),(.337,.037)],
            'sun':[(.047,.10),(.108,.085),(.223,.042)],
            'lantern':[(.071,.14),(.176,.10),(.39,.056)],
            'cafe':[(.055,.09),(.122,.07),(.237,.045)],
            'mist':[(.083,.12),(.184,.09),(.418,.05)]}[style]
    b=a.copy()
    for d,g in delays:
        s=int(d*SR)
        b[s:,0]+=a[:-s,1]*g
        b[s:,1]+=a[:-s,0]*g*.93
    return b

def air_bed(scene,style,rng):
    # All synthesized. Filtered uncorrelated air + sparse water/rain events.
    a=np.empty((N,2),dtype='f4')
    low={'cafe':2100,'bowl':1100,'mist':1150,'tea':2800,'sun':1900,'lantern':1550}[style]
    sos=butter(2,[100,low],btype='bandpass',fs=SR,output='sos')
    for c in range(2):
        white=rng.standard_normal(N,dtype='f4')
        y=sosfilt(sos,white).astype('f4')
        y/=np.sqrt(np.mean(y.astype('f8')**2))+1e-6
        a[:,c]=y
        del white,y
    t=np.arange(N,dtype='f4')/SR
    slow=.78+.10*np.sin(2*np.pi*t/33)+.08*np.sin(2*np.pi*t/83+.4)
    a*=slow[:,None]
    del t
    if style in ('tea','mist','lantern'):
        k=0
        when=float(rng.uniform(11,20))
        while when<DURATION-3:
            length=int(SR*float(rng.uniform(.18,.6)))
            at=int(when*SR)
            if at+length<N:
                d=np.arange(length,dtype='f4')/SR
                tone=float(rng.uniform(510,1100))
                sig=(np.sin(2*np.pi*tone*d)*np.exp(-d*9.)*.13).astype('f4')
                sign=-.5 if k%2 else .6
                a[at:at+length,0]+=sig*(1-sign)
                a[at:at+length,1]+=sig*(1+sign)
            when+=float(rng.uniform(12,43 if style=='tea' else 36));k+=1
    return a

def dynamic_curve(style):
    # Different kinds of journeys need different energy motion.
    if style=='cafe':pts=[(0,.30),(28,.92),(83,1.03),(180,.91),(255,.78),(330,.89),(440,.79),(570,.97),(650,.85),(742,.82),(825,.94),(900,.80)]
    elif style=='bowl':pts=[(0,.18),(32,.75),(120,.94),(225,.88),(335,.76),(445,.92),(580,.82),(670,.75),(770,.84),(900,.48)]
    elif style=='mist':pts=[(0,.26),(65,.91),(155,.93),(270,.83),(390,.80),(510,.93),(655,.88),(770,.83),(900,.62)]
    elif style=='tea':pts=[(0,.20),(80,.76),(205,.83),(340,.68),(470,.82),(590,.70),(730,.76),(900,.51)]
    elif style=='sun':pts=[(0,.22),(60,.93),(145,1.03),(225,.83),(390,.95),(510,.85),(680,1.0),(780,.80),(900,.68)]
    else:pts=[(0,.24),(75,.90),(175,.92),(270,.79),(375,.90),(540,.85),(690,.94),(800,.82),(900,.62)]
    anchors=np.asarray(pts)
    return np.interp(np.arange(N,dtype='f4')/SR,anchors[:,0],anchors[:,1]).astype('f4')

def build(scene,p):
    st=time.time();style=p['style'];rng=np.random.default_rng(p['seed']); print('BUILD',scene,style,flush=True);
    h=np.zeros((N,2),dtype='f4');d=np.zeros_like(h)
    chord_times=[];t=0.;idx=0
    while t<DURATION:
        length=float(p['chord_sec']*rng.uniform(.85,1.25))
        chord_times.append((t,length,p['chords'][idx%len(p['chords'])],idx))
        t+=length;idx+=1
    for begin,length,chord,k in chord_times:
        # Optional inversions in distant chapters, preserving the location's home tonal colors.
        for j,m in enumerate(chord):
            note=m + (12 if (k%7==6 and j==3 and style!='bowl') else 0)
            amp=.027 if j==0 else .019 if j==1 else .016
            if style=='bowl':amp*=.85
            if style=='tea':amp*=.70
            pan=float([-.37,-.08,.19,.40][j])
            put(h,pad_voice(note,begin,max(15,length+11),amp,pan,style,p['seed']+k*7+j))
    print('DONE CHORDS',round(time.time()-st,1),flush=True)
    if style=='bowl':
        # Long gestural space with deliberately slow call-and-response rather than metronomic chimes.
        at=11.;k=0
        while at<DURATION-13:
            note=p['palette'][(k*3 + k//3)%len(p['palette'])]
            pan=(-.56 if k%2==0 else .54)*float(rng.uniform(.7,1))
            put(d,bowl(note,at,.075*float(rng.uniform(.69,1.0)),pan,p['seed']+k))
            if k%6 in (2,4):
                put(d,bowl(note+7,at+4.2,.023, -pan*.6,p['seed']+k+300))
            at+=float(rng.uniform(25,49));k+=1
    else:
        at=float(rng.uniform(9,16));k=0
        while at<DURATION-8:
            # A recognizable, soft returning shape, but not the same phrase every bar.
            notes=p['palette'];anchor=notes[(k*3+k//5)%len(notes)]
            count=int(rng.choice([1,2,3] if style in ('cafe','sun') else [1,1,2,3]))
            motif=[anchor]+[notes[(k*3+j*2+(k//4))%len(notes)] for j in range(1,count)]
            for j,note in enumerate(motif):
                dt=j*float(rng.uniform(.45,1.4 if style=='sun' else 2.2))
                vel={'cafe':.026,'mist':.020,'tea':.017,'sun':.027,'lantern':.021}[style]
                v=vel*float(rng.uniform(.75,1.13))*(.82 if j>0 else 1)
                put(d,pluck(note,at+dt,v,[-.48,.38,.09][j],style,p['seed']+k*3+j,duration=5.5))
            at+=float(p['lead_sec']*rng.uniform(.65,1.50))
            k+=1
    # Place-specific motifs recur sparingly as landmarks. For Focus, this is
    # harmonic memory rather than a distracting melodic chorus.
    if style=='cafe':
        for at,seq in [(247,[73,71,69]),(520,[76,73,71,69]),(732,[69,71,73])]:
            for j,m in enumerate(seq):put(d,pluck(m,at+j*1.43,.023,[-.35,.16,.37][j%3],style,901+j+int(at),duration=6.))
    elif style=='sun':
        for at,seq in [(192,[72,74,76]),(476,[79,77,74]),(708,[72,69,67])]:
            for j,m in enumerate(seq):put(d,pluck(m,at+j*1.07,.029,[-.21,.25,0][j],style,1110+j+int(at)))
    elif style=='lantern':
        for at,seq in [(250,[67,71]),(545,[64,67,71]),(779,[69,67])]:
            for j,m in enumerate(seq):put(d,pluck(m,at+j*2.5,.023,[-.3,.2,-.1][j],style,1300+j+int(at),duration=6.))
    print('DONE LEAD',round(time.time()-st,1),flush=True)
    d=blur_room(d,style)
    a=air_bed(scene,style,rng);print('DONE AIR',round(time.time()-st,1),flush=True)
    curves=dynamic_curve(style)
    # More change in musical light than in loudness. Avoid an abrupt peak or fake 'healing frequency'.
    h*=curves[:,None]
    d*=np.minimum(1.06,curves+.14)[:,None]
    a*=np.minimum(1,curves+.25)[:,None]
    del curves
    # Stereo is generated; original first 3m remains to preserve the recognizable sound.
    target=p['scene_rms']
    for arr,goal in zip((h,d,a),target):
        rms=np.sqrt(np.mean(np.square(arr[225*SR:800*SR],dtype='f8')))+1e-8
        arr*=min(12.,goal/rms)
    mapping={'chiang-mai':['score','wood','air'],'bali':['score','resonance','air'],'da-lat':['harmony','wood','air']}
    if scene in mapping:
        starts=mapping[scene]
        old=[decode_old(scene,name) for name in starts]
        length=min(180*SR,*[len(x) for x in old if x is not None])
        tim=np.arange(length,dtype='f4')/SR
        old_fade=np.clip((180.-tim)/27.,0,1)
        new_fade=np.clip((tim-146.)/30.,0,1)
        for arr,oldarr in zip((h,d,a),old):
            if oldarr is not None:
                arr[:length]*=new_fade[:,None]
                arr[:length]+=oldarr[:length]*old_fade[:,None]
        del old
    # 1.8s fade from silence avoids clicks, last 0.6s slight attenuation for mid-journey crossfade.
    n_in=int(1.8*SR);n_out=int(.6*SR)
    for arr in (h,d,a):
        arr[:n_in]*=np.linspace(0,1,n_in,dtype='f4')[:,None]
        arr[-n_out:]*=np.linspace(1,.85,n_out,dtype='f4')[:,None]
    print('DONE BLEND',round(time.time()-st,1),flush=True)
    peak=float(np.max(np.abs(h+d+a)))
    scale=min(1.,.76/max(peak,1e-6))
    for arr in (h,d,a):arr*=scale
    mix=h+d+a
    peak=float(np.max(abs(mix)));rms=float(np.sqrt(np.mean(mix.astype('f8')**2)))
    print('DONE NORMALIZE',round(time.time()-st,1),flush=True)
    fsize=0
    for stem,arr,br in zip(STEMS,(h,d,a),('72k','56k','40k')):
        fsize+=write_audio(f'{scene}-{stem}.mp3',arr,br)
    print(f'{scene:14s} peak={20*np.log10(max(peak,1e-8)):.1f}dB rms={20*np.log10(max(rms,1e-8)):.1f}dB  stems={fsize/1e6:.1f}MB  {time.time()-st:.1f}s',flush=True)
    return {'title':p['title'],'mood':p['mood'],'styles':style,'durationSeconds':DURATION,
      'stems':{name:f'{scene}-{name}.mp3' for name in STEMS},
      'master':None,'preview':None,
      'reference':f'{scene}-score.mp3' if scene in ('chiang-mai','bali') else None,
      'chapters':p['moments'],
      'peakDbFS':round(float(20*np.log10(peak)),1),
      'rmsDbFS':round(float(20*np.log10(rms)),1)}

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={'version':'3.2-intent-build','sampleRate':SR,'clipDurationSeconds':DURATION,
      'sessionOptions':[20,40,60,'∞'],'priceGateEnabled':False,'source':'v3.2-procedural-reconstruction','license':'Original programmatically generated prototype; not real destination field audio','scenes':{},
      'designLimits':['long sessions crossfade a 15min arranged programme rather than claiming 60min wholly unique recordings',
        'all new sounds are procedural synthetic sketches, not real location recordings, binaural science or verified therapeutic treatments']}
    for slug,setting in SCENES.items():
        if os.getenv('SCENE_ONLY') and os.getenv('SCENE_ONLY')!=slug:continue
        report['scenes'][slug]=build(slug,setting)
        gc.collect()
    (OUT/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('Audio render finished',flush=True)

if __name__=='__main__':main()