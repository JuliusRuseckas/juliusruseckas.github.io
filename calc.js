const scope = { _: 0 };

function deleteItem(liTag){
	liTag.parentNode.removeChild(liTag);
}

function insertItem(liTag){
	let txt = liTag.getElementsByTagName("PRE")[0].firstChild.nodeValue;
	let formInput = document.calcForm.inputArea;
	formInput.value = txt;
	formInput.scrollIntoView(false);
	formInput.focus()
}

function insertHistory(input, result,err){
	input = input.trim();
	
	let liTag = document.createElement("li");
	
	let aTag = document.createElement("a");
	aTag.className = "control";
	aTag.href = "#";
	aTag.onclick = function(){ insertItem(liTag); return false; };
	aTag.appendChild(document.createTextNode("V"));
	liTag.appendChild(aTag);
	
	aTag = document.createElement("a");
	aTag.className = "control";
	aTag.href = "#";
	aTag.onclick = function(){ deleteItem(liTag); return false; };
	aTag.appendChild(document.createTextNode("X"));
	liTag.appendChild(aTag);
	
	let preTag = document.createElement("pre");
	preTag.appendChild(document.createTextNode(input));
	liTag.appendChild(preTag);
	
	preTag = document.createElement("pre");
	preTag.className = err? "error" : "output";
	preTag.appendChild(document.createTextNode(result));
	liTag.appendChild(preTag);
	
	let listElem = document.getElementById("historyList");
	listElem.appendChild(liTag);
	
	document.calcForm.inputArea.scrollIntoView(false);
}

function saveHistory(){
	let wnd = window.open("","calculatorHistory");
	let calcDate = new Date();
	
	let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
		"Oct", "Nov", "Dec"];
		
	let histTitle = "Calculation - " +	calcDate.getDate() + " " +
		monthNames[calcDate.getMonth()] + " " + calcDate.getHours() + ":" +
		calcDate.getMinutes();
	
	let liArray = document.getElementById("historyList").getElementsByTagName("LI");
	
	let txt = "<html><head><title>";
	txt += histTitle;
	txt += "</title></head><body><h2>";
	txt += histTitle;
	txt += "</h2><ol>";
	
	for(let i=0; i<liArray.length; i++){
		txt += "<li>";
		let preArray = liArray[i].getElementsByTagName("PRE");
		for(let j=0; j< preArray.length; j++){
			txt += "<pre>";
			txt += preArray[j].firstChild.nodeValue;
			txt += "</pre>";
		}
		txt += "</li>";
	}
	
	txt += "</ol></body></html>";
	
	wnd.document.open();
	wnd.document.write(txt);
	wnd.document.close();
}

function clearAll(){
	document.calcForm.inputArea.value="";
	
	let listElem = document.getElementById("historyList");
	while (listElem.firstChild) {
		listElem.removeChild(listElem.firstChild);
	}
	
	scroll(0,0);
}

function performCalculation() {
	const inputEl = document.calcForm.inputArea;
	const inputText = inputEl.value.trim();
	
	if (!inputText) return;
	
	let err = false;
	let outputText = "";
	
	try {
		const result = math.evaluate(inputText, scope);
		scope._ = result;
		outputText = math.format(result);
	} catch (e) {
		outputText = `${e.name}: ${e.message}`;
		err = true;
	}
	
	insertHistory(inputText, outputText, err);
	inputEl.select();
}

function handleKey(evt) {
	evt = evt || window.event;
	
	if (evt.keyCode == 13){
		if(! evt.shiftKey){
		
			if(evt.preventDefault){
				evt.preventDefault();
			} else {
				evt.returnValue = false;
			}
			performCalculation();
		}
	}
}
