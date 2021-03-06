
// All durations are represented and calculated in mintues.

var phases = [
	{name:"Valtas", duration: 5/60, change: true},
	{name:"Bal Santi shi", weight: 15/40},
	{name:"Valtas", duration: 5/60, change: true},
	{name:"Jobb Santi shi", weight: 15/40},
	{name:"Valtas", duration: 5/60, change: true},
	{name:"Bal Sárkány", weight: 3/40},
	{name:"Valtas", duration: 5/60, change: true},
	{name:"Jobb Sárkány", weight: 3/40},
	{name:"Valtas", duration: 5/60, change: true},
	{name:"Bal Tigris", weight: 2/40},
	{name:"Valtas", duration: 5/60, change: true},
	{name:"Jobb Tigris", weight: 2/40},
];

var totalChangesDuration = 0;

for (let phase of phases) {
	if (phase.change) {
		totalChangesDuration += phase.duration;
	}
}

// App state
var startTime = null;
var stopTime = null;
var duration = 0;
var durationWithoutChanges = 0;
var currentPhaseIdx = -1;
var animateID = null;

// initApp initializes the app.
function initApp() {
	phaseChangeAudio.volume = 0.5;
	finishedAudio.volume = 0.5;

	restoreValues("paramFirstDay", "paramFirstDuration", "paramLastDuration", "paramSound");
	if (elByID("paramFirstDay").value == "") {
		elByID("paramFirstDay").value = todayString();
	}
	
	initTable();
	processParams();

	let storedStopTime = getKey("stopTime");
	if (storedStopTime != null) {
		stopTime = new Date(Number(storedStopTime));
	}

	let storedStartTime = getKey("startTime");
	if (storedStartTime != null) {
		startTime = new Date(Number(storedStartTime));
		updateInfoPanel();
	}

	let storedCurrentPhaseIdx = getKey("currentPhaseIdx");
	if (storedCurrentPhaseIdx != null) {
		currentPhaseIdx = Number(storedCurrentPhaseIdx);
	}

	let storedAnimating = getKey("animating");
	if (storedAnimating != null) {
		if (Number(storedAnimating)) {
			startStop(true);
		}
	}

	updateTable();
}

function resetApp() {
	if (animateID) {
		startStop();
	}

	if (typeof(Storage) != "undefined") {
		localStorage.clear();
	}

	location.reload();
}

function initTable() {
	let table = elByID("infoTable");

	for (let i = 0; i < phases.length; i++) {
		let phase = phases[i];
		let tr = document.createElement("tr");
		let td = document.createElement("td");
		td.innerText = phase.name;
		tr.appendChild(td);
		for (let i = 0; i < 4; i++) {
			tr.appendChild(document.createElement("td"));
		}
		if (i%4 == 3) {
			tr.style.backgroundColor = "#fff3cf";
		}
		if (phase.change) {
			tr.style.display = "none";
		}
		table.appendChild(tr);
	}

	// Footer
	let tr = document.createElement("tr");
	let th = document.createElement("th");
	th.innerText = "Összesen";
	tr.appendChild(th);
	for (let i = 0; i < 4; i++) {
		tr.appendChild(document.createElement("td"));
	}
	table.appendChild(tr);

	updateTable();
}

function updateTable() {
	let elapsed = getElapsed();

	let table = elByID("infoTable");
	// Footer:
	let cells = table.rows[table.rows.length-1].cells;
	cells[1].innerText = formatMin(duration);
	cells[2].innerText = formatMin(elapsed);
	cells[3].innerText = formatMin(duration - elapsed);
	percentCell(cells[4], elapsed / duration);

	let foundCurrentIdx = false;
	for (let i = 0; i < phases.length; i++) {
		let phase = phases[i];
		let phaseDuration = phase.duration ? phase.duration : durationWithoutChanges * phase.weight;

		let cells = table.rows[i+1].cells;
		cells[1].innerText = formatMin(phaseDuration);

		if (elapsed < phaseDuration) {
			cells[2].innerText = formatMin(elapsed);
			cells[3].innerText = formatMin(phaseDuration - elapsed);
			percentCell(cells[4], elapsed / phaseDuration);
			if (animateID && !foundCurrentIdx) {
				foundCurrentIdx = true;
				if (phase.change && currentPhaseIdx != i) {
					currentPhaseIdx = i;
					setKeyValue("currentPhaseIdx", currentPhaseIdx);
					changeSound();
				}
			}
			elapsed = 0;
		} else {
			elapsed -= phaseDuration;
			cells[2].innerText = formatMin(phaseDuration);
			cells[3].innerText = formatMin(0);
			percentCell(cells[4], 1);
		}
	}
}

function percentCell(cell, progress) {
	let percent = Math.round(progress * 100);
	cell.style = "background:linear-gradient(to right,#fd0 "+percent+"%,#ccc "+percent+"%)";
	cell.innerText = percent+"%";
}

function processParams() {
	storeValues("paramFirstDay", "paramFirstDuration", "paramLastDuration");

	let firstDay = elByID("paramFirstDay").valueAsDate;
	let day = 1 + Math.floor(daysBetween(firstDay, new Date()));
	if (day < 1) {
		return setInfoError("A kezdő dátum a jövőben van!");
	}
	if (day > 999) {
		return setInfoError("Érvénytelen kezdő dátum!");
	}

	let firstDuration = elByID("paramFirstDuration").valueAsNumber;
	let lastDuration = elByID("paramLastDuration").valueAsNumber;
	if (isNaN(firstDuration)) {
		return setInfoError("Add meg az 1. napi állást!");
	}
	if (firstDuration <= 0) {
		return setInfoError("Az 1. napi állásnak 0-nál nagyobbnak kell lennie!");
	}
	if (isNaN(lastDuration)) {
		return setInfoError("Add meg az 100. napi állást!");
	}
	if (firstDuration > lastDuration) {
		return setInfoError("Az 1. napi állás nem lehet kisebb a 100. napinál!");
	}
	
	// All good!
	durationWithoutChanges = firstDuration + (lastDuration - firstDuration) / 99 * (day-1);

	clearInfoError();
	elByID("infoDay").innerText = day;
	elByID("infoDuration").innerText = formatMin(durationWithoutChanges);

	duration = durationWithoutChanges + totalChangesDuration;

	updateTable();
}

function startStop(fromInit) {
	function stopAnimation() {
		clearInterval(animateID);
		animateID = null;
		setKeyValue("animating", animateID ? 1 : 0);

		if (!isOver()) {
			stopTime = new Date();
			setKeyValue("stopTime", stopTime.getTime());
		}

		updateInfoPanel();
		elByID("startStopButton").innerText = "Indítás!";
		
		noSleep.disable();
	}
	
	if (animateID) {
		stopAnimation();
		return;
	}

	elByID("startStopButton").innerText = "Leállítás!";
	
	if (fromInit) {
		// If we're called from init, no need to set below variables!
	} else {
		currentPhaseIdx = -1;
		setKeyValue("currentPhaseIdx", currentPhaseIdx);
		startTime = new Date();
		setKeyValue("startTime", startTime.getTime());
		stopTime = null;
		delKey("stopTime");
		animating = 1;
		setKeyValue("animating", 1);
	}

	updateInfoPanel();

	function frame() {
		updateTable();
		if (isOver()) {
			finishedSound();
			stopAnimation();
		}
	}
	frame(); // Call it now
	animateID = setInterval(frame, 1000);

	noSleep.enable();
}

// updateInfoPanel upates the info panel.
// Can only be called once startTime has been set.
function updateInfoPanel() {
	// use en-GB local for time formatting (it uses 24-hour format)
	elByID("infoStart").innerText = startTime.toLocaleTimeString("en-GB");
	elByID("infoEnd").innerText = new Date(startTime.getTime() + duration*60000).toLocaleTimeString("en-GB");
	if (stopTime != null) {
		elByID("infoStop").innerText = stopTime.toLocaleTimeString("en-GB");
		elByID("infoStopPanel").style.display = "";
	} else {
		elByID("infoStopPanel").style.display = "none";
	}

	if (isOver()) {
		elByID("infoCongratulations").style.display = "";
	} else {
		elByID("infoCongratulations").style.display = "none";
	}

	elByID("infoStartEnd").style.display = "";
}

function getElapsed() {
	let elapsed = 0;
	if (startTime != null) {
		if (stopTime != null) {
			elapsed = stopTime - startTime;
		} else {
			elapsed = new Date() - startTime;
		}
		elapsed /= 60000;
	}
	if (elapsed > duration) {
		elapsed = duration;
	}
	return elapsed
}

// isOver tells if duration has elapsed, including change times.
function isOver() {
	return getElapsed() >= duration;
}

function formatMin(duration) {
	let min = Math.floor(duration);
	let sec = Math.round(60 * (duration % 1));

	if (sec == 60) {
		sec = 0;
		min++;
	}

	return min + ":" + String(sec).padStart(2, "0")
}

function clearInfoError() {
	elByID("infoError").style.display = "none";
	elByID("infoOK").style.display = "";
}

function setInfoError(msg) {
	elByID("infoError").innerText = msg;

	elByID("infoError").style.display = "";
	elByID("infoOK").style.display = "none";
}

function treatAsUTC(date) {
	var result = new Date(date);
	result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
	return result;
}

function daysBetween(startDate, endDate) {
	const millisecondsPerDay = 24 * 60 * 60 * 1000;
	return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}

// todayString returns today's date in the format of "2021-10-30"
function todayString() {
	return new Date().toISOString().slice(0,10);
}

function elByID(id) {
	return document.getElementById(id);
}

function changeSound() {
	if (elByID("paramSound").checked) {
		phaseChangeAudio.play();
	}
}

function finishedSound() {
	if (elByID("paramSound").checked) {
		finishedAudio.play();
	}
}

var phaseChangeAudio = new Audio("static/change.mp3");
var finishedAudio = new Audio("static/end.mp3");

var noSleep = new NoSleep();

// toreValues stores the "values" of the elements given by their IDs in the local storage.
function storeValues(...ids) {
	for (let id of ids) {
		storeValue(id);
	}
}

// storeValue stores the "value" of the element given by its ID in the local storage.
// Value is determined like this:
//   -if the element is a SELECT, the selected option's value is used
//   -if the element is an INPUT with type "checkbox", its checked attribute is used
//   -if the element has a value attribute, its value is used
//   -otherwise the element's textContent is used.
function storeValue(id) {
	if (typeof(Storage) == "undefined") {
		return; // No local storage support
	}

	var el = elByID(id);
	var value;
	if(el.tagName === "SELECT") {
		value = el.options[el.selectedIndex].value;
	} else if (el.tagName === "INPUT" && el.type === "checkbox") {
		value = el.checked.toString();
	} else if (el.hasAttribute("value")) {
		value = el.value;
	} else {
		alert(el.hasAttribute("value"), el.value);
		value = el.textContent;
	}
	localStorage.setItem(id, value);
}

// restoreValues restores the values of the elements given by their IDs from the local storage.
function restoreValues(...ids) {
	for (let id of ids) {
		restoreValue(id);
	}
}

// restoreValue restores the value of the element given by its ID from the local storage.
function restoreValue(id) {
	if (typeof(Storage) == "undefined") {
		return; // No local storage support
	}

	var value = localStorage.getItem(id);
	if (value === null) {
		return;
	}
	var el = elByID(id);
	if (el.tagName === "SELECT") {
		// Only set value if it's a valid option:
		for (o of el.options) {
			if (o.value == value) {
				el.value = value;
				break
			}
		}
	} else if (el.tagName === "INPUT" && el.type === "checkbox") {
		el.checked = value == "true";
	} else if (el.hasAttribute("value")) {
		el.value = value;
	} else {
		el.textContent = value;
	}
}

// setKeyValue stores the given value for the given key in the local storage.
function setKeyValue(key, value) {
	if (typeof(Storage) == "undefined") {
		return; // No local storage support
	}

	localStorage.setItem(key, value);
}

// getKey returns the stored value for the given key from the local storage.
function getKey(key) {
	if (typeof(Storage) == "undefined") {
		return; // No local storage support
	}

	return localStorage.getItem(key);
}

// delKey deletes the stored value for the given key from the local storage.
function delKey(key) {
	if (typeof(Storage) == "undefined") {
		return; // No local storage support
	}

	localStorage.removeItem(key);
}
