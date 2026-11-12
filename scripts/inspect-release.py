import hashlib,io,json,pathlib,re,subprocess,sys,tarfile,zipfile
root=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path(__file__).resolve().parents[1]
patterns={"private-key":r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", "github-token":r"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})", "npm-token":r"npm_[A-Za-z0-9]{30,}", "azure-key":r"AccountKey=[A-Za-z0-9+/]{40,}={0,2}", "password":r"(?i)(?:password|pwd)\s*=\s*[^;\s\"']{8,}"}
def scan(name,body):
 try:text=body.decode('utf-8')
 except UnicodeDecodeError:return
 for rule,pattern in patterns.items():
  if re.search(pattern,text):raise SystemExit(f'Secret-pattern review required: {name} ({rule}); value omitted')
files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=root,text=True).splitlines()
for name in files:
 p=root/name
 if p.is_file():scan(name,p.read_bytes())
history=subprocess.run(['git','log','--all','-p'],cwd=root,capture_output=True).stdout
scan('git history',history)
for path in sorted((root/'artifacts').rglob('*')):
 if not path.is_file() or path.suffix not in ('.nupkg','.snupkg','.tgz'):continue
 if path.suffix=='.tgz':
  with tarfile.open(path) as archive:entries=[(m.name,archive.extractfile(m).read()) for m in archive if m.isfile()]
  for name,body in entries:
   if not (name.startswith('package/dist/') or name in ['package/package.json','package/README.md','package/LICENSE','package/THIRD-PARTY-NOTICES.md']):raise SystemExit('Unexpected npm file: '+name)
   scan(name,body)
 else:
  with zipfile.ZipFile(path) as archive:entries=[(name,archive.read(name)) for name in archive.namelist() if not name.endswith('/')]
  for name,body in entries:
   if not (name.startswith(('lib/','_rels/','package/')) or name.endswith('.nuspec') or name in ['[Content_Types].xml','README.md','LICENSE','THIRD-PARTY-NOTICES.md','.signature.p7s']):raise SystemExit('Unexpected NuGet file: '+name)
   scan(name,body)
 print(json.dumps({'artifact':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'entries':len(entries)}))
print('Source/history patterns and package file allowlists passed. Review these results together with the source diff.')
