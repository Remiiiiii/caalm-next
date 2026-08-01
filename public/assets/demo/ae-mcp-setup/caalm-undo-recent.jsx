/**
 * Undo recent CAALM logo / re-transform edits:
 * - Remove all "CAALM Logo" layers
 * - Remove all "CAALM Dashboard" layers (re-added by accidental transform)
 * - Optionally shrink Text comps that were widened for logos (best-effort)
 */
function undoCaalmRecentEdit(args) {
	args = args || {};
	var report = {
		status: "success",
		logosRemoved: 0,
		dashboardsRemoved: 0,
		compsTouched: [],
		errors: [],
		savedTo: null,
	};

	try {
		app.beginUndoGroup("Undo CAALM logo / dashboard edits");

		for (var i = 1; i <= app.project.numItems; i++) {
			var item = app.project.item(i);
			if (!(item instanceof CompItem)) continue;

			var touched = false;
			for (var l = item.numLayers; l >= 1; l--) {
				var layer = item.layer(l);
				var name = layer.name;
				try {
					if (/^CAALM Logo$/i.test(name)) {
						layer.remove();
						report.logosRemoved++;
						touched = true;
						continue;
					}
					if (/^CAALM Dashboard$/i.test(name)) {
						layer.remove();
						report.dashboardsRemoved++;
						touched = true;
						continue;
					}
					// Orphan logo.png footage layers left from replace/place
					if (
						layer.source &&
						layer.source instanceof FootageItem &&
						layer.source.name === "logo.png"
					) {
						layer.remove();
						report.logosRemoved++;
						touched = true;
					}
				} catch (eL) {
					report.errors.push({
						comp: item.name,
						layer: name,
						error: String(eL),
					});
				}
			}
			if (touched) report.compsTouched.push(item.name);
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

	return JSON.stringify(report, null, 2);
}

(function () {
	var isBridge =
		typeof logToPanel === "function" || typeof getResultFilePath === "function";
	if (isBridge) return;
	var result = undoCaalmRecentEdit({});
	try {
		var f = new File(
			"C:/Users/victo/Documents/ae-mcp-bridge/ae_mcp_result.json",
		);
		f.encoding = "UTF-8";
		f.open("w");
		f.write(result);
		f.close();
	} catch (e) {}
})();
