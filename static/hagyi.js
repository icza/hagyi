
// All durations are represented and calculated in mintues.

var phases = [
	{name:"Bal Santi shi", weight: 15/40},
	{name:"Jobb Santi shi", weight: 15/40},
	{name:"Bal Sárkány", weight: 3/40},
	{name:"Jobb Sárkány", weight: 3/40},
	{name:"Bal Tigris", weight: 2/40},
	{name:"Jobb Tigris", weight: 2/40},
];

function initTable() {
	let table = elByID("infoTable");

	for (let phase of phases) {
		let tr = document.createElement("tr");
		let td = document.createElement("td");
		td.innerText = phase.name;
		tr.appendChild(td);
		for (let i = 0; i < 4; i++) {
			tr.appendChild(document.createElement("td"));
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

var startTime = null;
var duration = 0;
var currentPhaseIdx = -1;

function updateTable() {
	let elapsed = getElapsed()

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
		let phaseDuration = duration * phase.weight;

		let cells = table.rows[i+1].cells;
		cells[1].innerText = formatMin(phaseDuration);

		if (elapsed < phaseDuration) {
			cells[2].innerText = formatMin(elapsed);
			cells[3].innerText = formatMin(phaseDuration - elapsed);
			percentCell(cells[4], elapsed / phaseDuration);
			if (animateID && !foundCurrentIdx) {
				foundCurrentIdx = true;
				if (currentPhaseIdx != i) {
					defaultBeep();
					currentPhaseIdx = i;
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
	duration = firstDuration + (lastDuration - firstDuration) / 99 * (day-1);

	clearInfoError();
	elByID("infoDay").innerText = day;
	elByID("infoDuration").innerText = formatMin(duration);

	updateTable();
}

var animateID;

function startStop() {
	function stopAnimation() {
		clearInterval(animateID);
		animateID = null;
		elByID("startStopButton").innerText = "Indítás!";
	}
	
	if (animateID) {
		stopAnimation();
		return;
	}

	elByID("infoCongratulations").style.display = "none";
	elByID("startStopButton").innerText = "Leállítás!";
	
	currentPhaseIdx = -1;
	startTime = new Date();
	elByID("infoStart").innerText = startTime.toLocaleTimeString("en-GB"); // en-GB local uses 24-hour format
	elByID("infoEnd").innerText = new Date(startTime.getTime() + duration*60000).toLocaleTimeString("en-GB");
	elByID("infoStartEnd").style.display = "";

	function frame() {
		let elapsed = getElapsed()
		updateTable();
		if (elapsed >= duration) {
			stopAnimation();
			elByID("infoCongratulations").style.display = "";
		}
	}
	frame(); // Call it now
	animateID = setInterval(frame, 1000);
}

function getElapsed() {
	let elapsed = 0;
	if (startTime != null) {
		elapsed = (new Date() - startTime) / 60000;
	}
	if (elapsed > duration) {
		elapsed = duration;
	}
	return elapsed
}

function formatMin(duration) {
	let min = Math.floor(duration);
	let sec = Math.round(60 * (duration % 1));

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

function defaultBeep() {
	if (elByID("paramSound").checked) {
		beep(800, 440, 0.05);
	}
}

var audioCtx; // Lazy init, some browsers require user interaction first!

// All arguments are optional:
// duration of the tone in milliseconds. Default is 500
// frequency of the tone in hertz. default is 440
// volume of the tone. Default is 1, off is 0.
function beep(duration, frequency, volume) {
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
	}

	var oscillator = audioCtx.createOscillator();
	var gainNode = audioCtx.createGain();

	oscillator.connect(gainNode);
	gainNode.connect(audioCtx.destination);

	if (volume) {
		gainNode.gain.value = volume;
	}
	if (frequency) {
		oscillator.frequency.value = frequency;
	}

	oscillator.start(audioCtx.currentTime);
	oscillator.stop(audioCtx.currentTime + ((duration || 500) / 1000));
};