(() => {
	function replaceNeuroStreamText(value) {
		if (value === null || value === undefined) return value;
		return String(value).replace(/NeuroStream/gi, "CAALM");
	}

	function pickPoppinsFont(currentFont) {
		var font = String(currentFont || "");
		var lower = font.toLowerCase();
		if (lower.indexOf("black") !== -1) return "Poppins-Black";
		if (lower.indexOf("extrabold") !== -1 || lower.indexOf("extra bold") !== -1)
			return "Poppins-ExtraBold";
		if (lower.indexOf("bold") !== -1) return "Poppins-Bold";
		if (lower.indexOf("semibold") !== -1 || lower.indexOf("semi bold") !== -1)
			return "Poppins-SemiBold";
		if (lower.indexOf("medium") !== -1) return "Poppins-Medium";
		if (lower.indexOf("light") !== -1) return "Poppins-Light";
		if (lower.indexOf("thin") !== -1) return "Poppins-Thin";
		if (lower.indexOf("italic") !== -1) return "Poppins-Italic";
		return "Poppins-Regular";
	}

	function updateTextDocument(textDocument) {
		var changed = false;
		var originalText = textDocument.text;
		var nextText = replaceNeuroStreamText(originalText);
		if (nextText !== originalText) {
			textDocument.text = nextText;
			changed = true;
		}
		var nextFont = pickPoppinsFont(textDocument.font);
		if (textDocument.font !== nextFont) {
			try {
				textDocument.font = nextFont;
				changed = true;
			} catch (e1) {
				try {
					textDocument.font = "Poppins";
					changed = true;
				} catch (e2) {}
			}
		}
		return changed;
	}

	app.beginUndoGroup("Rebrand to CAALM");
	try {
		var project = app.project;
		var i, c, l, k;

		for (i = 1; i <= project.numItems; i++) {
			var item = project.item(i);
			var newName = replaceNeuroStreamText(item.name);
			if (newName !== item.name) item.name = newName;
		}

		for (c = 1; c <= project.numItems; c++) {
			var compItem = project.item(c);
			if (!(compItem instanceof CompItem)) continue;

			for (l = 1; l <= compItem.numLayers; l++) {
				var layer = compItem.layer(l);
				var layerNewName = replaceNeuroStreamText(layer.name);
				if (layerNewName !== layer.name) layer.name = layerNewName;
				if (!(layer instanceof TextLayer)) continue;

				var sourceText = layer.property("Source Text");
				if (!sourceText) continue;

				if (sourceText.numKeys && sourceText.numKeys > 0) {
					for (k = 1; k <= sourceText.numKeys; k++) {
						var keyDoc = sourceText.keyValue(k);
						if (updateTextDocument(keyDoc)) {
							sourceText.setValueAtKey(k, keyDoc);
						}
					}
				} else {
					var textDoc = sourceText.value;
					if (updateTextDocument(textDoc)) {
						sourceText.setValue(textDoc);
					}
				}
			}
		}

		var saveFile = new File(Folder.myDocuments.fsName + "/caalm-demo.aep");
		project.save(saveFile);
		alert("Done.\nSaved as: " + saveFile.fsName);
	} catch (err) {
		alert("Rebrand failed: " + err.toString());
	}
	app.endUndoGroup();
})();
