import json,struct,sys,re
KEEP=re.search(r"const KEEP = (\[.*?\]);", open(__import__('os').path.join(__import__('os').path.dirname(__file__),'convert-avatar.mjs')).read()).group(1).replace("'",'"')
KEEP=json.loads(KEEP)
for f in sys.argv[1:]:
    b=open(f,'rb').read()
    l=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+l]); rest=b[20+l:]
    for m in j['meshes']:
        m['extras']={'targetNames':KEEP}
    s=json.dumps(j,separators=(',',':')).encode(); s+=b' '*((4-len(s)%4)%4)
    out=struct.pack('<4sII',b'glTF',2,12+8+len(s)+len(rest))+struct.pack('<I',len(s))+b'JSON'+s+rest
    open(f,'wb').write(out); print(f, len(out), KEEP[:3])
