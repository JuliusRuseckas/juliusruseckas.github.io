const DEG = Math.PI/180;
let _ = 0;

//physical constants

const SpeedOfLight = 299792458; //exact
const PlanckConstant = 6.62607015e-34; //exact
const hbar = 1.054571817e-34;
const ElectronMass =  9.1093837015e-31;
const ProtonMass = 1.67262192369e-27;
const ElementaryCharge = 1.602176634e-19; //exact
const FineStructureConstant = 7.2973525693e-3;
const MagneticConstant = 1.25663706212e-6;
const ElectricConstant = 8.8541878128e-12;
const ImpedanceOfVacuum = MagneticConstant * SpeedOfLight;
const AvogadroConstant = 6.02214076e23; //exact 
const BoltzmannConstant = 1.380649e-23; //exact
const MolarGasConstant = AvogadroConstant * BoltzmannConstant;
const AtomicMassUnit = 1.66053906660e-27;
const StefanBoltzmannConstant = 5.670374419e-8
const GravitationalConstant = 6.67430e-11;
const StandardAcceleration = 9.80665;

//trigonometric functions

function cot(x){
	return 1/Math.tan(x);
}

function csc(x){
	return 1/Math.sin(x);
}

function sec(x){
	return 1/Math.cos(x);
}

function acot(x){
	return Math.PI/2+atan(x);
}

function acsc(x){
	return Math.asin(1/x);
}

function asec(x){
	return Math.acos(1/x);
}

// hyperbolic functions

function sinh(x) {
	return (Math.exp(x)-Math.exp(-x))/2;
}

function cosh(x){
	return (Math.exp(x)+Math.exp(-x))/2;
}

function tanh(x){
	let a1 = Math.exp(x);
	let a2 = Math.exp(-x);
	return (a1-a2)/(a1+a2);
}

function coth(x){
	let a1 = Math.exp(x);
	let a2 = Math.exp(-x);
	return (a1+a2)/(a1-a2);
}

function csch(x){
	return 2/(Math.exp(x)-Math.exp(-x));
}

function sech(x){
	return 2/(Math.exp(x)+Math.exp(-x));
}

function asinh(x){
	return Math.log(x+Math.sqrt(1+x*x));
}

function acosh(x){
	return Math.log(x+Math.sqrt(x*x-1));
}

function atanh(x){
	return Math.log((1+x)/(1-x))/2;
}

function acoth(x){
	return Math.log((1+x)/(x-1))/2;
}

function acsch(x){
	return Math.log(1/x+Math.sqrt(1+1/(x*x)));
}

function asech(x){
	return Math.log(1/x+Math.sqrt(1/(x*x)-1));
}

// other functions

function sinc(x){
	return Math.sin(x)/x;
}

//non mathematical part

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
	input = input.replace(/\s+$/, "");
	input = input.replace(/^\s+/, "");
	
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
	let form = document.calcForm;
	let inputText = form.inputArea.value;
	let err = false;
	let outputText = "";
	
	function echo(str) {
		outputText += str +"\n";
	}
	
	if (inputText.search(/\S/) != -1) {
		try {
			with(Math){
				var resultText = eval(inputText);
			}

			_ = resultText;
			outputText += resultText;
		}
		catch (e) {
			outputText = e.name + ": " + e.message;
			err = true;
		}
		
		insertHistory(inputText, outputText, err);
		form.inputArea.select();
	}
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
