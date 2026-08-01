(function(){
  function srcFor(name){
    for (var i=1;i<=app.project.numItems;i++){
      var it=app.project.item(i);
      if(it instanceof CompItem && it.name===name){
        for(var l=1;l<=it.numLayers;l++){
          if(it.layer(l).name==="CAALM Dashboard"){
            return {comp:name, source: it.layer(l).source?it.layer(l).source.name:null, layerOrder:[]};
          }
        }
      }
    }
    return {comp:name, source:null};
  }
  var names=["Text 01","Text 05","Text 10","Text 02","Text 03"];
  var out=[];
  for(var n=0;n<names.length;n++){
    var r=srcFor(names[n]);
    out.push(r);
  }
  var f=new File(Folder.myDocuments.fsName+"/ae-mcp-bridge/ae_mcp_result.json");
  f.encoding="UTF-8"; f.open("w"); f.write(JSON.stringify({cycleCheck:out},null,2)); f.close();
})();
