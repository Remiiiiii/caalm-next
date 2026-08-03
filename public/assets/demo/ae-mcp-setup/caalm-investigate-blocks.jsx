(() => {
	var report = {
		status: "ok",
		activeComp: null,
		caalmDashboardLayers: [],
		whiteSolidLayers: [],
		suspiciousLayersInActive: [],
		hypothesis: [],
	};

	function layerBrief(comp, layer) {
		var info = {
			comp: comp.name,
			index: layer.index,
			name: layer.name,
			enabled: layer.enabled,
			opacity: null,
			scale: null,
			position: null,
			inPoint: layer.inPoint,
			outPoint: layer.outPoint,
			sourceName: null,
			sourceType: null,
			sourceWidth: null,
			sourceHeight: null,
			hasEffects: false,
			effectNames: [],
		};
		try {
			info.opacity = layer.property("Opacity").value;
		} catch (e) {}
		try {
			info.scale = layer.property("Scale").value;
		} catch (e) {}
		try {
			info.position = layer.property("Position").value;
		} catch (e) {}
		try {
			if (layer.source) {
				info.sourceName = layer.source.name;
				info.sourceWidth = layer.source.width;
				info.sourceHeight = layer.source.height;
				if (layer.source instanceof CompItem) info.sourceType = "Comp";
				else if (layer.source instanceof FootageItem) {
					if (layer.source.mainSource instanceof SolidSource) {
						info.sourceType = "Solid";
						info.solidColor = layer.source.mainSource.color;
					} else if (layer.source.mainSource instanceof FileSource) {
						info.sourceType = "File";
						try {
							info.filePath = layer.source.file.fsName;
						} catch (e2) {}
					} else info.sourceType = "Footage";
				}
			} else if (layer instanceof TextLayer) info.sourceType = "Text";
		} catch (e3) {}
		try {
			if (layer.effect && layer.effect.numProperties > 0) {
				info.hasEffects = true;
				for (var e = 1; e <= Math.min(layer.effect.numProperties, 8); e++) {
					info.effectNames.push(layer.effect(e).name);
				}
			}
		} catch (e4) {}
		return info;
	}

	try {
		if (app.project.activeItem instanceof CompItem) {
			var ac = app.project.activeItem;
			report.activeComp = {
				name: ac.name,
				width: ac.width,
				height: ac.height,
				numLayers: ac.numLayers,
				time: ac.time,
			};
			for (var i = 1; i <= ac.numLayers; i++) {
				var ly = ac.layer(i);
				if (!ly.enabled) continue;
				if (ac.time < ly.inPoint || ac.time > ly.outPoint) continue;
				var brief = layerBrief(ac, ly);
				// Flag large light rectangles
				var isDash =
					ly.name === "CAALM Dashboard" ||
					/demo-0\d/.test(String(brief.sourceName || ""));
				var isWhiteSolid =
					brief.sourceType === "Solid" &&
					brief.solidColor &&
					brief.solidColor[0] > 0.9 &&
					brief.solidColor[1] > 0.9 &&
					brief.solidColor[2] > 0.9;
				var isLarge =
					brief.scale &&
					(brief.scale[0] > 40 ||
						(brief.sourceWidth && brief.sourceWidth > ac.width * 0.3));
				if (
					isDash ||
					isWhiteSolid ||
					(isLarge && brief.sourceType === "File")
				) {
					report.suspiciousLayersInActive.push(brief);
				}
			}
		}

		for (var p = 1; p <= app.project.numItems; p++) {
			var item = app.project.item(p);
			if (!(item instanceof CompItem)) continue;
			for (var l = 1; l <= item.numLayers; l++) {
				var layer = item.layer(l);
				if (layer.name === "CAALM Dashboard") {
					report.caalmDashboardLayers.push(layerBrief(item, layer));
				}
				try {
					if (
						layer.source instanceof FootageItem &&
						layer.source.mainSource instanceof SolidSource
					) {
						var c = layer.source.mainSource.color;
						if (c[0] > 0.9 && c[1] > 0.9 && c[2] > 0.9 && layer.enabled) {
							report.whiteSolidLayers.push(layerBrief(item, layer));
						}
					}
				} catch (e5) {}
			}
		}

		if (report.caalmDashboardLayers.length) {
			report.hypothesis.push(
				"CAALM Dashboard layers (" +
					report.caalmDashboardLayers.length +
					") are light-mode PNG screenshots with white/light UI backgrounds. Nested inside Text comps used over the dark space scene, they read as large white blocks.",
			);
		}
		if (report.whiteSolidLayers.length) {
			report.hypothesis.push(
				"Found " +
					report.whiteSolidLayers.length +
					" enabled near-white solid layers (possible light-mode remap side effect).",
			);
		}
	} catch (err) {
		report.status = "error";
		report.message = String(err);
	}

	// Trim arrays for readability
	report.caalmDashboardLayersSample = report.caalmDashboardLayers.slice(0, 8);
	report.caalmDashboardCount = report.caalmDashboardLayers.length;
	report.whiteSolidCount = report.whiteSolidLayers.length;
	report.whiteSolidLayersSample = report.whiteSolidLayers.slice(0, 10);
	delete report.caalmDashboardLayers;
	delete report.whiteSolidLayers;

	var f = new File(
		Folder.myDocuments.fsName + "/ae-mcp-bridge/ae_mcp_result.json",
	);
	f.encoding = "UTF-8";
	f.open("w");
	f.write(JSON.stringify(report, null, 2));
	f.close();
})();
