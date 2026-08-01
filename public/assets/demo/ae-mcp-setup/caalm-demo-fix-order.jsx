/**
 * Fix: move CAALM Dashboard layers below text so motion graphics stay readable.
 * Also try replacing footage inside Design* comps with cycled dashboards.
 */
(function () {
	var DASHBOARD_FILES = [
		"demo-05-audit-charts.png",
		"demo-06-analytics.png",
		"demo-04-licenses.png",
		"demo-02-calendar.png",
		"demo-07-contracts-full.png",
	];

	function findFootage(name) {
		for (var i = 1; i <= app.project.numItems; i++) {
			var item = app.project.item(i);
			if (item instanceof FootageItem && item.name === name) return item;
		}
		return null;
	}

	function parseTextNum(name) {
		var m = String(name).match(/^Text\s+(\d+)$/i);
		return m ? parseInt(m[1], 10) : null;
	}

	var report = {
		status: "success",
		reordered: 0,
		designReplaced: 0,
		errors: [],
	};

	try {
		app.beginUndoGroup("CAALM fix dashboard order");

		var footageItems = [];
		for (var f = 0; f < DASHBOARD_FILES.length; f++) {
			var ft = findFootage(DASHBOARD_FILES[f]);
			if (ft) footageItems.push(ft);
		}

		for (var i = 1; i <= app.project.numItems; i++) {
			var item = app.project.item(i);
			if (!(item instanceof CompItem)) continue;
			var num = parseTextNum(item.name);
			if (num === null) continue;

			for (var l = 1; l <= item.numLayers; l++) {
				var layer = item.layer(l);
				if (layer.name === "CAALM Dashboard") {
					layer.moveToEnd();
					report.reordered += 1;
					// Fit a bit smaller so text hero stays dominant
					try {
						var sw = layer.source.width;
						if (sw > 0) {
							var scale = ((item.width * 0.62) / sw) * 100;
							layer.property("Scale").setValue([scale, scale]);
							layer.property("Position").setValue([
								item.width * 0.62,
								item.height * 0.55,
							]);
						}
					} catch (e1) {}
					break;
				}
			}
		}

		// Replace image footage inside Design comps if any
		for (var d = 1; d <= app.project.numItems; d++) {
			var design = app.project.item(d);
			if (!(design instanceof CompItem)) continue;
			if (!/^Design/i.test(design.name)) continue;
			if (!footageItems.length) continue;

			var dashIdx = (d - 1) % footageItems.length;
			for (var dl = 1; dl <= design.numLayers; dl++) {
				var dlayer = design.layer(dl);
				try {
					var src = dlayer.source;
					if (
						src instanceof FootageItem &&
						src.mainSource instanceof FileSource
					) {
						dlayer.replaceSource(footageItems[dashIdx], false);
						report.designReplaced += 1;
						break;
					}
				} catch (e2) {}
			}
		}

		app.project.save();
		app.endUndoGroup();
	} catch (err) {
		try {
			app.endUndoGroup();
		} catch (e) {}
		report.status = "error";
		report.message = String(err);
	}

	try {
		var outFile = new File(
			Folder.myDocuments.fsName + "/ae-mcp-bridge/ae_mcp_result.json",
		);
		outFile.encoding = "UTF-8";
		outFile.open("w");
		outFile.write(JSON.stringify(report, null, 2));
		outFile.close();
	} catch (e3) {}
})();
