(function () {
	var report = {
		status: "success",
		removed: 0,
		compsTouched: 0,
		errors: [],
		savedTo: null,
	};

	try {
		app.beginUndoGroup("Remove CAALM Dashboard layers");

		for (var i = 1; i <= app.project.numItems; i++) {
			var item = app.project.item(i);
			if (!(item instanceof CompItem)) continue;

			var removedInComp = 0;
			// Walk top to bottom so indexes stay valid while deleting
			for (var l = item.numLayers; l >= 1; l--) {
				var layer = item.layer(l);
				if (layer.name === "CAALM Dashboard") {
					try {
						layer.remove();
						removedInComp += 1;
						report.removed += 1;
					} catch (e) {
						report.errors.push({
							comp: item.name,
							index: l,
							error: String(e),
						});
					}
				}
			}
			if (removedInComp > 0) report.compsTouched += 1;
		}

		app.project.save();
		report.savedTo = app.project.file ? app.project.file.fsName : null;
		app.endUndoGroup();
	} catch (err) {
		try {
			app.endUndoGroup();
		} catch (e2) {}
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
