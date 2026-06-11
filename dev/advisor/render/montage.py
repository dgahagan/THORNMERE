from PIL import Image, ImageDraw
import glob, os

def make(contest, sub, seeds):
    files=[(s, f'dev/pixel-art/candidates/{contest}_s{s}_sub{sub}.png') for s in seeds]
    files=[(s,f) for s,f in files if os.path.exists(f)]
    cell=384; lab=28; cols=len(files)
    # full montage labeled
    W=cell*cols; H=cell+lab
    m=Image.new('RGB',(W,H),(20,20,24))
    d=ImageDraw.Draw(m)
    for i,(s,f) in enumerate(files):
        im=Image.open(f).convert('RGB')
        m.paste(im,(i*cell,lab))
        d.text((i*cell+6,8),f'seed {s}',fill=(255,255,255))
    m.save(f'dev/advisor/render/{contest}_montage.png')
    # game-scale readability strip: downscale 4x preview -> 1x (96x80), then upscale 2x nearest for visibility
    gs=96; gh=80; pad=10; sw=gs*2
    W2=(sw+pad)*cols+pad; H2=gh*2+lab+pad
    g=Image.new('RGB',(W2,H2),(20,20,24))
    dg=ImageDraw.Draw(g)
    for i,(s,f) in enumerate(files):
        im=Image.open(f).convert('RGB').resize((gs,gh),Image.NEAREST).resize((sw,gh*2),Image.NEAREST)
        x=pad+i*(sw+pad)
        g.paste(im,(x,lab))
        dg.text((x+2,8),f's{s}',fill=(255,255,255))
    g.save(f'dev/advisor/render/{contest}_gamescale.png')
    print(contest,'done',len(files),'seeds')

make('mon_spider','13',[3,7,11,17,23,42])
make('mon_ghost','13',[3,7,11,17,23,42])
make('mon_mock_king','15',[1,3,5,7,11,13,17,23,31,42])
