(function(){
  var textWithDash = 0, footageNames = [], sample = null;
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof FootageItem && /^demo-0/.test(item.name)) footageNames.push(item.name);
    if (!(item instanceof CompItem)) continue;
    if (!/^Text\s+\d+$/i.test(item.name)) continue;
    for (var l = 1; l <= item.numLayers; l++) {
      if (item.layer(l).name === "CAALM Dashboard") {
        textWithDash++;
        if (!sample) {
          sample = {
            comp: item.name,
            layers: [],
            dashIndex: item.layer(l).index,
            dashSource: item.layer(l).source ? item.layer(l).source.name : null
          };
          for (var s = 1; s <= item.numLayers; s++) {
            sample.layers.push({ index: s, name: item.layer(s).name });
          }
        }
      }
    }
  }
  var bgCheck = null;
  var color = null;
  for (var c = 1; c <= app.project.numItems; c++) {
    if (app.project.item(c) instanceof CompItem && app.project.item(c).name === "CAALM Presentation - Color") {
      color = app.project.item(c);
      break;
    }
  }
  if (color) {
    for (var b = 1; b <= color.numLayers; b++) {
      var ly = color.layer(b);
      if (ly.name === "BG" && ly.source && ly.source.mainSource && ly.source.mainSource.color) {
        bgCheck = ly.source.mainSource.color;
        break;
      }
    }
  }
  var out = { textCompsWithDashboard: textWithDash, footageNames: footageNames, sampleTextComp: sample, bgColorSample: bgCheck };
  var f = new File(Folder.myDocuments.fsName + "/ae-mcp-bridge/ae_mcp_result.json");
  f.encoding = "UTF-8"; f.open("w"); f.write(JSON.stringify(out, null, 2)); f.close();
})();
