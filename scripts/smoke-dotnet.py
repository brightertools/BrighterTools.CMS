import os,pathlib,subprocess,xml.etree.ElementTree as ET
root=pathlib.Path(__file__).resolve().parents[1]
config=ET.Element('configuration');sources=ET.SubElement(config,'packageSources');ET.SubElement(sources,'clear')
ET.SubElement(sources,'add',key='candidates',value=str(root/'artifacts/nuget'))
ET.SubElement(sources,'add',key='nuget.org',value='https://api.nuget.org/v3/index.json')
path=root/'artifacts/consumer.NuGet.config';ET.ElementTree(config).write(path,encoding='utf-8',xml_declaration=True)
dotnet=str(pathlib.Path(os.environ['DOTNET_ROOT'])/('dotnet.exe' if os.name=='nt' else 'dotnet')) if os.environ.get('DOTNET_ROOT') else 'dotnet'
subprocess.run([dotnet,'restore',str(root/'examples/dotnet'),'--configfile',str(path),'--packages',str(root/'artifacts/consumer-cache')],check=True)
subprocess.run([dotnet,'run','--project',str(root/'examples/dotnet'),'--no-restore'],check=True)
