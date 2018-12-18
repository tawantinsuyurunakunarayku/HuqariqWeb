$("body, html").not('#menu-toggle').click(function(e) {
    if($('#wrapper').hasClass("toggled") && !$(e.target).is('#menu-toggle, #side-menu, #side-menu *'))
    {
        //alert('asd');
        $("#menu-toggle").trigger("click");
    }
});


$("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});

// fork getUserMedia for multiple browser versions, for the future
// when more browsers support MediaRecorder

navigator.getUserMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);

// set up basic variables for app

var record = document.querySelector('.record');
var stop = document.querySelector('.stop');
var upload = document.querySelector('.upload');
var soundClips = document.querySelector('.sound-clips');
var canvas = document.querySelector('.visualizer');
var mediaRecorder = null;
var mediaStreamSource = null;
var ignoreAutoPlay = false;

// disable stop button while not recording

stop.disabled = true;
upload.disabled = true;

// visualiser setup - create web audio api context and canvas

var audioCtx = new (window.AudioContext || webkitAudioContext)();
var canvasCtx = canvas.getContext("2d");
var region = document.getElementById('hidRegion').textContent;
//main block for doing the audio recording

var recordedServer = getRecordedServer();

// path to audios
var audios_hint = "/static/recording";

if (navigator.getUserMedia) {
    console.log('getUserMedia supported.');

    var constraints = { audio: true, video: false };
    var chunks = [];

    var onSuccess = function(stream) {
        mediaRecorder = new MediaRecorder(stream);
        mediaStreamSource = audioCtx.createMediaStreamSource(stream);

        var word = getNextWord();
        console.log("Next word is " + word);
        if (word === null) {
            promptToSave();
        }
        updateProgress();
        document.querySelector('.info-display').innerText = word;
        document.querySelector('.audio-hint').src = audios_hint + "/" + region + "/"  + wantedWords[region][word];

        record.onclick = function() {
            visualize(stream);

            // Display a countdown before recording starts.
            // var progress = document.querySelector('.progress-display');
            // progress.classList.add('countdown');
            // progress.innerText = "3";
            // setTimeout(function() {
	          //     progress.innerText = "2";
	          //     setTimeout(function() {
	          //         progress.innerText = "1";
	          //         setTimeout(function() {
		                    // progress.innerText = "";
		                    startRecording();
	          //         }, 800);
	          //     }, 700);
            // }, 600);
            stop.disabled = false;
            record.disabled = true;
        };

        stop.onclick = function() {
            if (mediaRecorder.state == 'inactive') {
                // The user has already pressed stop, so don't set up another word.
                ignoreAutoPlay = true;
            } else {
                mediaRecorder.stop();
                console.log("recorder stopped");
            }

            mediaStreamSource.disconnect();
            console.log(mediaRecorder.state);
            record.style.background = "";
            record.style.color = "";
            stop.disabled = true;
            record.disabled = false;
            console.log(mediaRecorder.state);
        };

        upload.onclick = function() {
            saveRecordings();
        };

        mediaRecorder.onstop = function(e) {
            console.log("data available after MediaRecorder.stop() called.");

            var clipName = document.querySelector('.info-display').innerText;
            var clipContainer = document.createElement('article');
            var clipLabel = document.createElement('p');
            var audio = document.createElement('audio');
            var deleteButton = document.createElement('button');

            clipContainer.classList.add('clip');
            clipLabel.classList.add('clip-label');
            audio.setAttribute('controls', '');
            deleteButton.textContent = 'Borrar';
            deleteButton.className = 'delete';
            clipLabel.textContent = clipName;

            clipContainer.appendChild(audio);
            clipContainer.appendChild(clipLabel);
            clipContainer.appendChild(deleteButton);
            soundClips.appendChild(clipContainer);

            audio.controls = true;
            var blob = new Blob(chunks, { 'type' : 'audio/webm' });
            chunks = [];
            var audioURL = window.URL.createObjectURL(blob);
            audio.src = audioURL;
            console.log("recorder stopped");

            var word = getNextWord();
            if (word === null) {
                promptToSave();
                return;
            }

            document.querySelector('.info-display').innerText = word;
            document.querySelector('.audio-hint').src = audios_hint + "/" + region + "/"  + wantedWords[region][word];
            updateProgress();
            updateReadySend();

            deleteButton.onclick = function(e) {
                evtTgt = e.target;
                evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
	              updateProgress();
                updateReadySend();
                $("<div title='Atencion'>El audio ya cambio. Volver a escuchar</div>").dialog({modal:true});
            };

        };

        mediaRecorder.ondataavailable = function(e) {
            chunks.push(e.data);
        };
    };

    var onError = function(err) {
        console.log('The following error occured: ' + err);
    };

    navigator.getUserMedia(constraints, onSuccess, onError);
} else {
    console.log('getUserMedia not supported on your browser!');
    document.querySelector('.info-display').innerText =
	      'Your device does not support the HTML5 API needed to record audio (this is a known problem on iOS)';
}

function visualize(stream) {
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    mediaStreamSource.connect(analyser);

    WIDTH = canvas.width;
    HEIGHT = canvas.height;

    draw();

    function draw() {

        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = 'rgb(200, 200, 200)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

        canvasCtx.beginPath();

        var sliceWidth = WIDTH * 1.0 / bufferLength;
        var x = 0;

        for(var i = 0; i < bufferLength; i++) {

            var v = dataArray[i] / 128.0;
            var y = v * HEIGHT/2;

            if(i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height/2);
        canvasCtx.stroke();
    }
}

var wantedWords = {
    "chanca" : {
        "Cinema":"Cinema.mp3",
        "Phutiy":"Phutiy.mp3",
        "Chhalluy":"Chhalluy.mp3",
        "Aguilapa rapranmi chhallalla kasqa":"Aguilapa rapranmi chhallalla kasqa.mp3",
        "K'allmachkan sach'akunata":"K'allmachkan sach'akunata.mp3",
        "Papata khutuykachimuy":"Papata khutuykachimuy.mp3",
        "Iñiq warmim nuyurqusqa":"Iñiq warmim nuyurqusqa.mp3",
        "Enero":"Enero.mp3",
        "Arguedas":"Arguedas.mp3",
        "Guevara centinelataqa guiñarqachusmi":"Guevara centinelataqa guiñarqachusmi.mp3",
        "Purichaykachipullawankimá":"Purichaykachipullawankimá.mp3",
        "Ch'ulla gorduchataqa khuyapayanim":"Ch'ulla gorduchataqa khuyapayanim.mp3",
        "Edificio":"Edificio.mp3",
        "Vidriuta chhalluspayki":"Vidriuta chhalluspayki.mp3",
        "khipuy p'akisqa takllata":"khipuy p'akisqa takllata.mp3",
        "Wiqru":"Wiqru.mp3",
        "Gustar":"Gustar.mp3",
        "Ch'akisqa shachata yantanki":"Ch'akisqa shachata yantanki.mp3",
        "Pitaq urquta excavachkan":"Pitaq urquta excavachkan.mp3",
        "Shaphchiykamuy mana puñunanpaq":"Shaphchiykamuy mana puñunanpaq.mp3",
        "Achanqaraytam tukurqusqa":"Achanqaraytam tukurqusqa.mp3",
        "Q'iwi":"Q'iwi.mp3",
        "Phulluchapi phusputa convidaykamuway":"Phulluchapi phusputa convidaykamuway.mp3",
        "Manchaykachiwachkaptinchik":"Manchaykachiwachkaptinchik.mp3",
        "Manam":"Manam.mp3",
        "Manaraq musyakuchkankuchu":"Manaraq musyakuchkankuchu.mp3",
        "Aguanta":"Aguanta.mp3",
        "Llaqtamasinwan hakarayakuchkan":"Llaqtamasinwan hakarayakuchkan.mp3",
        "Q'ala thultum akllachkan":"Q'ala thultum akllachkan.mp3",
        "Manaraqmi tutaykamullasqachu":"Manaraqmi tutaykamullasqachu.mp3",
        "Willariway":"Willariway.mp3",
        "Enemigo":"Enemigo.mp3",
        "Q'imiy":"Q'imiy.mp3",
        "Basurapa ukunpim tarini":"Basurapa ukunpim tarini.mp3",
        "Cañonazuwanqa mana dudaspam k'uytuykuna":"Cañonazuwanqa mana dudaspam k'uytuykuna.mp3",
        "Casacaykiwan chhuqchuy jardinta":"Casacaykiwan chhuqchuy jardinta.mp3",
        "Boxeota qawachkan":"Boxeota qawachkan.mp3",
        "Thutam qhusi verdurata mikun":"Thutam qhusi verdurata mikun.mp3",
        "Pasñachata rimapayaykullachkani":"Pasñachata rimapayaykullachkani.mp3",
        "Achacháw":"Achacháw.mp3",
        "Paykunaqa piñarikuchkanku":"Paykunaqa piñarikuchkanku.mp3",
        "Mana arrancachinchu qhipapi carruta":"Mana arrancachinchu qhipapi carruta.mp3",
        "T'impusqa yakuta upyay":"T'impusqa yakuta upyay.mp3",
        "Chuñu":"Chuñu.mp3",
        "Unanchasqa":"Unanchasqa.mp3",
        "Bañar":"Bañar.mp3",
        "Racimo":"Racimo.mp3",
        "P'ankuykuy ñuqapa ch'uspayta":"P'ankuykuy ñuqapa ch'uspayta.mp3",
        "Qunqayllamantam chayayqamurqa":"Qunqayllamantam chayayqamurqa.mp3",
        "Wañuriy":"Wañuriy.mp3",
        "Agua":"Agua.mp3",
        "Camote":"Camote.mp3",
        "Chuñu miskita ruray":"Chuñu miskita ruray.mp3",
        "Shachuyay":"Shachuyay.mp3",
        "Phusuqu":"Phusuqu.mp3",
        "Chuychuy":"Chuychuy.mp3",
        "K'uymakuyta ruwarqaniku":"K'uymakuyta ruwarqaniku.mp3",
        "T'impuy":"T'impuy.mp3",
        "Achkam quñunakullasun nirqanitaq":"Achkam quñunakullasun nirqanitaq.mp3",
        "Phullu":"Phullu.mp3",
        "Ungüentuwan churaykachimuway":"Ungüentuwan churaykachimuway.mp3",
        "Aguila":"Aguila.mp3",
        "Anchayarunñam paypas":"Anchayarunñam paypas.mp3",
        "P'aqlapa cucharantachu wischurqapun":"P'aqlapa cucharantachu wischurqapun.mp3",
        "Phanqawan elefantita p'ampaykamuy":"Phanqawan elefantita p'ampaykamuy.mp3",
        "Exámen":"Exámen.mp3",
        "Tawa guitarrata apay fiestaman":"Tawa guitarrata apay fiestaman.mp3",
        "Qhaquy":"Qhaquy.mp3",
        "Fantasma barkuwan":"Fantasma barkuwan.mp3",
        "P'inqay":"P'inqay.mp3",
        "Vómito":"Vómito.mp3",
        "Ñañaykunawanmi":"Ñañaykunawanmi.mp3",
        "Chayarqamuspankupas":"Chayarqamuspankupas.mp3",
        "Khakuy":"Khakuy.mp3",
        "Aguerrida sipaskunas asikuchkanku":"Aguerrida sipaskunas asikuchkanku.mp3",
        "Centinela":"Centinela.mp3",
        "Allquchaqa musyarqamuwan":"Allquchaqa musyarqamuwan.mp3",
        "Qhachu":"Qhachu.mp3",
        "Uhu":"Uhu.mp3",
        "Rimaykachayninkunawanmi waqani":"Rimaykachayninkunawanmi waqani.mp3",
        "Imaynatataq aguantasaq":"Imaynatataq aguantasaq.mp3",
        "P'unqu":"P'unqu.mp3",
        "Racimupa phusuqunta ch'allay":"Racimupa phusuqunta ch'allay.mp3",
        "Hamparata aqawasiman apay":"Hamparata aqawasiman apay.mp3",
        "Cinemapi yachachiqta pusamuy":"Cinemapi yachachiqta pusamuy.mp3",
        "Imaynallam":"Imaynallam.mp3",
        "Obrero":"Obrero.mp3",
        "Chayaykuchkaptinkuñachusmi tusurqa":"Chayaykuchkaptinkuñachusmi tusurqa.mp3",
        "Guapa qhachunqa bañakuchkan":"Guapa qhachunqa bañakuchkan.mp3",
        "Gordo":"Gordo.mp3",
        "Sexo":"Sexo.mp3",
        "Chhalla":"Chhalla.mp3",
        "Ungüento":"Ungüento.mp3",
        "Mamaypa llikllachanta illariypi siray":"Mamaypa llikllachanta illariypi siray.mp3",
        "Centro":"Centro.mp3",
        "Taytachapa wasinman":"Taytachapa wasinman.mp3",
        "Ordenado":"Ordenado.mp3",
        "Yuyachiway":"Yuyachiway.mp3",
        "Dedo":"Dedo.mp3",
        "Antiguo":"Antiguo.mp3",
        "T'uqu":"T'uqu.mp3",
        "Imapaqtaq qillqarqa willakuyta":"Imapaqtaq qillqarqa willakuyta.mp3",
        "Thaka thaltatam huk joven vomitakuchkan":"Thaka thaltatam huk joven vomitakuchkan.mp3",
        "Extranjirupa ajedrizninta pakay":"Extranjirupa ajedrizninta pakay.mp3",
        "Azteca":"Azteca.mp3",
        "Yanqamanta thintiykachachkan":"Yanqamanta thintiykachachkan.mp3",
        "Dinosauriupa aychan":"Dinosauriupa aychan.mp3",
        "Ichuq ñuñuta uqllachkan":"Ichuq ñuñuta uqllachkan.mp3",
        "Yachariy":"Yachariy.mp3",
        "K'uytuy":"K'uytuy.mp3",
        "Junio killapiña casarakusun":"Junio killapiña casarakusun.mp3",
        "Iquyasqa wiqrum":"Iquyasqa wiqrum.mp3",
        "Arí":"Arí.mp3",
        "Q'ipi":"Q'ipi.mp3",
        "Basucatam t'uqyarqachin wak aqarway":"Basucatam t'uqyarqachin wak aqarway.mp3",
        "Khutuy":"Khutuy.mp3",
        "Octubre":"Octubre.mp3",
        "Uchuychallam bigote sapacha":"Uchuychallam bigote sapacha.mp3",
        "Punchawllaraqmiki kachkasqaqa":"Punchawllaraqmiki kachkasqaqa.mp3",
        "Yaw maqlla aqtuy chay chupita":"Yaw maqlla aqtuy chay chupita.mp3",
        "Antiguo edificium wakqa":"Antiguo edificium wakqa.mp3",
        "Grillukunata guisarqamuy":"Grillukunata guisarqamuy.mp3",
        "Feriapim rantirqaniku":"Feriapim rantirqaniku.mp3",
        "Juez":"Juez.mp3",
        "Oro":"Oro.mp3",
        "Elefante":"Elefante.mp3",
        "Wankakunapachu":"Wankakunapachu.mp3",
        "Hinaspa ñutumuy rumita":"Hinaspa ñutumuy rumita.mp3",
        "Chhapchiy":"Chhapchiy.mp3",
        "Huk shika lawa":"Huk shika lawa.mp3",
        "Convidar":"Convidar.mp3",
        "Auxilio":"Auxilio.mp3",
        "T'uqupi indio pakakusqa":"T'uqupi indio pakakusqa.mp3",
        "Isqun p'asñakunam ripukunku":"Isqun p'asñakunam ripukunku.mp3",
        "Examinar":"Examinar.mp3",
        "Willankim ñuqapa llakiyniykunamantapas":"Willankim ñuqapa llakiyniykunamantapas.mp3",
        "Patuman qaraykamuy":"Patuman qaraykamuy.mp3",
        "Escuela":"Escuela.mp3",
        "Paykunallawanchusmi":"Paykunallawanchusmi.mp3",
        "Qam achahalata qaway kusikuywan":"Qam achahalata qaway kusikuywan.mp3",
        "Guevara":"Guevara.mp3",
        "Phutiywanmi tarikuni":"Phutiywanmi tarikuni.mp3",
        "Carruqa wichikuykusqa machu qaqaman":"Carruqa wichikuykusqa machu qaqaman.mp3",
        "Shillarichinki viernes punchawta":"Shillarichinki viernes punchawta.mp3",
        "Allinllachu":"Allinllachu.mp3",
        "Zapato":"Zapato.mp3",
        "Ch'isim dinerunta gastarqun":"Ch'isim dinerunta gastarqun.mp3",
        "Thampi":"Thampi.mp3",
        "Shullkaymi ganarqun kallpaypi":"Shullkaymi ganarqun kallpaypi.mp3",
        "Llapa sipaskunata suwamuni":"Llapa sipaskunata suwamuni.mp3",
        "Luylu linguistam examinachkan maytuta":"Luylu linguistam examinachkan maytuta.mp3",
        "Manaraq wañuykunapas chayarqamuchkaptin":"Manaraq wañuykunapas chayarqamuchkaptin.mp3",
        "Shaphchiy":"Shaphchiy.mp3",
        "Isqunllaraq":"Isqunllaraq.mp3",
        "Jueves punchawta k'usilluta apamuy":"Jueves punchawta k'usilluta apamuy.mp3",
        "Guacamayutam tarirqamuni":"Guacamayutam tarirqamuni.mp3",
        "Lunq'u":"Lunq'u.mp3",
        "Vicuña":"Vicuña.mp3",
        "Sach'a":"Sach'a.mp3",
        "Killincham qaqapa uchkunpi puñuchkan":"Killincham qaqapa uchkunpi puñuchkan.mp3",
        "Barriga":"Barriga.mp3",
        "Aguita":"Aguita.mp3",
        "Excavación":"Excavación.mp3",
        "Asirichiway":"Asirichiway.mp3",
        "Obrerukuna wasita thuñichichkanku":"Obrerukuna wasita thuñichichkanku.mp3",
        "Ñaqaqa waqakachachkarqakuchus":"Ñaqaqa waqakachachkarqakuchus.mp3",
        "Sexo maskaypi kachkan":"Sexo maskaypi kachkan.mp3",
        "Ñuñu":"Ñuñu.mp3",
        "Pescado":"Pescado.mp3",
        "Ch'uklla":"Ch'uklla.mp3",
        "Chhuqchuy":"Chhuqchuy.mp3",
        "Enano":"Enano.mp3",
        "Bilingüe wawakunachu":"Bilingüe wawakunachu.mp3",
        "Qam munaptiykiqa muchasayki":"Qam munaptiykiqa muchasayki.mp3",
        "Qhaquykuway dinosauriupa agüitanwan":"Qhaquykuway dinosauriupa agüitanwan.mp3",
        "Juezta q'uchurichiy qhurqutyachkan":"Juezta q'uchurichiy qhurqutyachkan.mp3",
        "Thinti":"Thinti.mp3",
        "Unu":"Unu.mp3",
        "Sullka wawqiywan sirarachimuy":"Sullka wawqiywan sirarachimuy.mp3",
        "Chhira":"Chhira.mp3",
        "Sipasqa asikuchkasqa":"Sipasqa asikuchkasqa.mp3",
        "Cerillo":"Cerillo.mp3",
        "Ch'ukllapim enanuqa tiyachkan":"Ch'ukllapim enanuqa tiyachkan.mp3",
        "Sasachakuykunaqa":"Sasachakuykunaqa.mp3",
        "Garrapata":"Garrapata.mp3",
        "Phiñasqa yutu":"Phiñasqa yutu.mp3",
        "Suegruymi q'imichkan":"Suegruymi q'imichkan.mp3",
        "Kusirichiway":"Kusirichiway.mp3",
        "Richkankuñamiki imaynatapas":"Richkankuñamiki imaynatapas.mp3",
        "Lunq'ukunam gozakuchkanku":"Lunq'ukunam gozakuchkanku.mp3",
        "Jabón":"Jabón.mp3",
        "Guiñar":"Guiñar.mp3",
        "Shachaykuy wak sinvergüenza qarita":"Shachaykuy wak sinvergüenza qarita.mp3",
        "Generalqa excavaciunta orurayku ruwasqa":"Generalqa excavaciunta orurayku ruwasqa.mp3",
        "Taqsakuchkarqakuñam":"Taqsakuchkarqakuñam.mp3",
        "Saxuta alberguipi waqachichkanku":"Saxuta alberguipi waqachichkanku.mp3",
        "Barrigaypim qhiti kachurquwan":"Barrigaypim qhiti kachurquwan.mp3",
        "T'alla ñañachayqa allintam ñitikusqa":"T'alla ñañachayqa allintam ñitikusqa.mp3",
        "Shakawi garrapatam deduypi kachurquwan":"Shakawi garrapatam deduypi kachurquwan.mp3",
        "Lingüista":"Lingüista.mp3",
        "Chiri chupita timpuykachimuchkay":"Chiri chupita timpuykachimuchkay.mp3",
        "P'ankuy":"P'ankuy.mp3",
        "Manam auxiliasunkichu":"Manam auxiliasunkichu.mp3",
        "Llulla irqikuna niraq":"Llulla irqikuna niraq.mp3",
        "Vidrio":"Vidrio.mp3",
        "Paya hatu mamayqa kuyapacham":"Paya hatu mamayqa kuyapacham.mp3",
        "Phiwipa pantasqanta hurquy":"Phiwipa pantasqanta hurquy.mp3",
        "Pirwapi ukucha waqachkan":"Pirwapi ukucha waqachkan.mp3",
        "Ch'isi":"Ch'isi.mp3",
        "Grillo":"Grillo.mp3",
        "Payachayta pusamuy":"Payachayta pusamuy.mp3",
        "Guanacuta hapiy":"Guanacuta hapiy.mp3",
        "Fiesta":"Fiesta.mp3",
        "Difícil k'aptaymi camotipa yuranqa":"Difícil k'aptaymi camotipa yuranqa.mp3",
        "General":"General.mp3",
        "Shillariy":"Shillariy.mp3",
        "Thaka":"Thaka.mp3",
        "Kunanqa hakarayachkankuñataqchus":"Kunanqa hakarayachkankuñataqchus.mp3",
        "Qhali":"Qhali.mp3",
        "Thalta":"Thalta.mp3",
        "Aguerrida":"Aguerrida.mp3",
        "Kuyasqaytaqa qawaykullarqanim":"Kuyasqaytaqa qawaykullarqanim.mp3",
        "Chhapchiparquspan mikhukuchkan":"Chhapchiparquspan mikhukuchkan.mp3",
        "Conductor":"Conductor.mp3",
        "Basura":"Basura.mp3",
        "Ovejankunaqa enero killapiqa shachuyankum":"Ovejankunaqa enero killapiqa shachuyankum.mp3",
        "Uno":"Uno.mp3",
        "Abrazo":"Abrazo.mp3",
        "Imanasqataq nanachkan sunquyki":"Imanasqataq nanachkan sunquyki.mp3",
        "Falda":"Falda.mp3",
        "Phanqa":"Phanqa.mp3",
        "Khakuykamuy sarata":"Khakuykamuy sarata.mp3",
        "Azutiwanmi juezqa maqakun":"Azutiwanmi juezqa maqakun.mp3",
        "Mikhuy":"Mikhuy.mp3",
        "Llapan willakuykunata chayachinki":"Llapan willakuykunata chayachinki.mp3",
        "K'intuchkan q'umir cocapa rapinta":"K'intuchkan q'umir cocapa rapinta.mp3",
        "Allinchay wak qillqata":"Allinchay wak qillqata.mp3",
        "Bilingüe":"Bilingüe.mp3",
        "T'ika":"T'ika.mp3",
        "Llakipayaypaq ñuñuchkan":"Llakipayaypaq ñuñuchkan.mp3",
        "Piñakuy":"Piñakuy.mp3",
        "Guerraqa manam faciltachu tuñichirqa":"Guerraqa manam faciltachu tuñichirqa.mp3",
        "Qhurqu":"Qhurqu.mp3",
        "Manañam k'uytukachanqachu":"Manañam k'uytukachanqachu.mp3",
        "Vacapa umanpi takllata watasun":"Vacapa umanpi takllata watasun.mp3",
        "Paykunallataqa qawaykullasunmi":"Paykunallataqa qawaykullasunmi.mp3",
        "Chayllaraqmi unquy chayarqamun":"Chayllaraqmi unquy chayarqamun.mp3",
        "Guerra":"Guerra.mp3",
        "Thampi conductormi payqa":"Thampi conductormi payqa.mp3",
        "Sasachakuykunam atipawachkan":"Sasachakuykunam atipawachkan.mp3",
        "Uqu":"Uqu.mp3",
        "Abrazachkan khirkinchuta":"Abrazachkan khirkinchuta.mp3",
        "Muchanachakuykullasuntaqyá":"Muchanachakuykullasuntaqyá.mp3",
        "Gema":"Gema.mp3",
        "Dinero":"Dinero.mp3",
        "Arguedaspam Agua obraqa":"Arguedaspam Agua obraqa.mp3",
        "Qawanpi tusunki arisqa zapatuykiwan":"Qawanpi tusunki arisqa zapatuykiwan.mp3",
        "Cazador":"Cazador.mp3",
        "Centrupi akchi kachkan":"Centrupi akchi kachkan.mp3",
        "Guanacukunata arreamuchkanku nakanankupaq":"Guanacukunata arreamuchkanku nakanankupaq.mp3",
        "Ama sunquyta p'inqachiychu":"Ama sunquyta p'inqachiychu.mp3",
        "Antigüo gimnasiatayá":"Antigüo gimnasiatayá.mp3",
        "Sach'api chhuruykachachkasqa":"Sach'api chhuruykachachkasqa.mp3",
        "Q'ipiri niraq purin":"Q'ipiri niraq purin.mp3",
        "Llaqtamasichaykunapaq":"Llaqtamasichaykunapaq.mp3",
        "Aqachatayá rantiykamuy":"Aqachatayá rantiykamuy.mp3",
        "Wak maqtaqa kuyakuyta yacharqa":"Wak maqtaqa kuyakuyta yacharqa.mp3",
        "Wawqicha":"Wawqicha.mp3",
        "Dolurwan fiebrim qispirquwan":"Dolurwan fiebrim qispirquwan.mp3",
        "Shullka":"Shullka.mp3",
        "Enemiguykichu":"Enemiguykichu.mp3",
        "Ñuqa ripukullachkaniñam":"Ñuqa ripukullachkaniñam.mp3",
        "Q'illu":"Q'illu.mp3",
        "Aztecapa punchawninpim":"Aztecapa punchawninpim.mp3",
        "Terremoto chayarqamun":"Terremoto chayarqamun.mp3",
        "Akllupa qipinpim puchka kachkan":"Akllupa qipinpim puchka kachkan.mp3",
        "T'ikaqa chakispanmi q'iwikun":"T'ikaqa chakispanmi q'iwikun.mp3",
        "Ch'uspa":"Ch'uspa.mp3",
        "Thuta":"Thuta.mp3",
        "Casaca":"Casaca.mp3",
        "Lluqllam urqumanta chayarqamun":"Lluqllam urqumanta chayarqamun.mp3",
        "Brujuqa espejuyuqmi":"Brujuqa espejuyuqmi.mp3",
        "Ukuchakunallam yaykuykullanqaku":"Ukuchakunallam yaykuykullanqaku.mp3",
        "Kuyakuy":"Kuyakuy.mp3",
        "Carro":"Carro.mp3",
        "Kaniykusqaykichikrayku":"Kaniykusqaykichikrayku.mp3",
        "Tuñiy":"Tuñiy.mp3",
        "Wiksay rupachkan nina ratachkaq hina":"Wiksay rupachkan nina ratachkaq hina.mp3",
        "Ampu masiykita pukllachimuy":"Ampu masiykita pukllachimuy.mp3",
        "Pipa jabunnintataq mayu chinkarqachin":"Pipa jabunnintataq mayu chinkarqachin.mp3",
        "Girasol":"Girasol.mp3",
        "Uqi gemakunatam gustasqaku":"Uqi gemakunatam gustasqaku.mp3",
        "Escuelapa iqma directorninmi":"Escuelapa iqma directorninmi.mp3",
        "Lluqlla":"Lluqlla.mp3",
        "Cazadormi qalay cabizbajo purichkan":"Cazadormi qalay cabizbajo purichkan.mp3",
        "Pinguinuqa ordinawchallam purin":"Pinguinuqa ordinawchallam purin.mp3",
        "T'ustuy":"T'ustuy.mp3",
        "Sullka":"Sullka.mp3",
        "P'unqupi unuqa allillamantam t'impun":"P'unqupi unuqa allillamantam t'impun.mp3",
        "Arrear":"Arrear.mp3",
        "Chuychukusqam kay runa":"Chuychukusqam kay runa.mp3",
        "Chicharrunta tiqtinapaq":"Chicharrunta tiqtinapaq.mp3",
        "Gimnasia":"Gimnasia.mp3",
        "Tusurichiway":"Tusurichiway.mp3",
        "Frutakunaqa k'ukuraqmi kachkasqa":"Frutakunaqa k'ukuraqmi kachkasqa.mp3",
        "Llamkaysimunkichikchu":"Llamkaysimunkichikchu.mp3",
        "Ajedrez":"Ajedrez.mp3",
        "Casar":"Casar.mp3",
        "Kawsariy":"Kawsariy.mp3",
        "Aqakuypim girasol faldachanta suwasqa":"Aqakuypim girasol faldachanta suwasqa.mp3",
        "Uhuwan ñakarichkan":"Uhuwan ñakarichkan.mp3",
        "Pescawta laqu cuchulliwan khallay":"Pescawta laqu cuchulliwan khallay.mp3",
        "Octobripi mañakusqa taytachata":"Octobripi mañakusqa taytachata.mp3",
        "Qhali warmaqa t'ustusqam":"Qhali warmaqa t'ustusqam.mp3",
        "Qampa sunquykichu":"Qampa sunquykichu.mp3",
        "Tuniy":"Tuniy.mp3",
        "Cerilluwan chhillpaykunki":"Cerilluwan chhillpaykunki.mp3",
        "Oveja":"Oveja.mp3",
        "Gemelupa gusanun":"Gemelupa gusanun.mp3",
        "Illariy":"Illariy.mp3",
        "Cañonazo":"Cañonazo.mp3",
        "Yaw luqhi lazuy":"Yaw luqhi lazuy.mp3",
        "Takichakustillanmi, yaw":"Takichakustillanmi, yaw.mp3",
        "Vicuñapa mikhusqan grama":"Vicuñapa mikhusqan grama.mp3",
        "Llamkarikullachkasun":"Llamkarikullachkasun.mp3",
        "Chhirawan allpanchikta aspirqamuy":"Chhirawan allpanchikta aspirqamuy.mp3",
        "Wasichaykachipuwankichikmi":"Wasichaykachipuwankichikmi.mp3",
        "Dinosaurio":"Dinosaurio.mp3",
        "Guacamayo":"Guacamayo.mp3"
    },
    "collao" : {
        "Cinema":"Cinema.mp3",
        "Phutiy":"Phutiy.mp3",
        "Chhalluy":"Chhalluy.mp3",
        "K'allmachkan sach'akunata":"K'allmachkan sach'akunata.mp3",
        "Iñiq warmim nuyurqusqa":"Iñiq warmim nuyurqusqa.mp3",
        "Enero":"Enero.mp3",
        "Arguedas":"Arguedas.mp3",
        "Guevara centinelataqa guiñarqachusmi":"Guevara centinelataqa guiñarqachusmi.mp3",
        "Purichaykachipullawankimá":"Purichaykachipullawankimá.mp3",
        "Ch'ulla gorduchataqa khuyapayanim":"Ch'ulla gorduchataqa khuyapayanim.mp3",
        "Edificio":"Edificio.mp3",
        "Vidriuta chhalluspayki":"Vidriuta chhalluspayki.mp3",
        "khipuy p'akisqa takllata":"khipuy p'akisqa takllata.mp3",
        "Wiqru":"Wiqru.mp3",
        "Gustar":"Gustar.mp3",
        "Pitaq urquta excavachkan":"Pitaq urquta excavachkan.mp3",
        "Shaphchiykamuy mana puñunanpaq":"Shaphchiykamuy mana puñunanpaq.mp3",
        "Achanqaraytam tukurqusqa":"Achanqaraytam tukurqusqa.mp3",
        "Q'iwi":"Q'iwi.mp3",
        "Phulluchapi phusputa convidaykamuway":"Phulluchapi phusputa convidaykamuway.mp3",
        "Manchaykachiwachkaptinchik":"Manchaykachiwachkaptinchik.mp3",
        "Manam":"Manam.mp3",
        "Manaraq musyakuchkankuchu":"Manaraq musyakuchkankuchu.mp3",
        "Aguanta":"Aguanta.mp3",
        "Llaqtamasinwan hakarayakuchkan":"Llaqtamasinwan hakarayakuchkan.mp3",
        "Q'ala thultum akllachkan":"Q'ala thultum akllachkan.mp3",
        "Manaraqmi tutaykamullasqachu":"Manaraqmi tutaykamullasqachu.mp3",
        "Willariway":"Willariway.mp3",
        "Enemigo":"Enemigo.mp3",
        "Q'imiy":"Q'imiy.mp3",
        "Cañonazuwanqa mana dudaspam k'uytuykuna":"Cañonazuwanqa mana dudaspam k'uytuykuna.mp3",
        "Casacaykiwan chhuqchuy jardinta":"Casacaykiwan chhuqchuy jardinta.mp3",
        "Boxeota qawachkan":"Boxeota qawachkan.mp3",
        "Thutam qhusi verdurata mikun":"Thutam qhusi verdurata mikun.mp3",
        "Vicuñaq mikhusqan grama":"Vicuñaq mikhusqan grama.mp3",
        "Pasñachata rimapayaykullachkani":"Pasñachata rimapayaykullachkani.mp3",
        "Achacháw":"Achacháw.mp3",
        "Paykunaqa piñarikuchkanku":"Paykunaqa piñarikuchkanku.mp3",
        "Mana arrancachinchu qhipapi carruta":"Mana arrancachinchu qhipapi carruta.mp3",
        "T'impusqa yakuta upyay":"T'impusqa yakuta upyay.mp3",
        "Unanchasqa":"Unanchasqa.mp3",
        "Bañar":"Bañar.mp3",
        "Racimo":"Racimo.mp3",
        "P'ankuykuy ñuqapa ch'uspayta":"P'ankuykuy ñuqapa ch'uspayta.mp3",
        "Qunqayllamantam chayayqamurqa":"Qunqayllamantam chayayqamurqa.mp3",
        "Wañuriy":"Wañuriy.mp3",
        "Agua":"Agua.mp3",
        "Camote":"Camote.mp3",
        "Chhalla. -2":"Chhalla. -2.mp3",
        "Chuñu miskita ruray":"Chuñu miskita ruray.mp3",
        "chayllaraqmin unquy chayamuy":"chayllaraqmin unquy chayamuy.mp3",
        "Shachuyay":"Shachuyay.mp3",
        "Phusuqu":"Phusuqu.mp3",
        "Chuychuy":"Chuychuy.mp3",
        "K'uymakuyta ruwarqaniku":"K'uymakuyta ruwarqaniku.mp3",
        "T'impuy":"T'impuy.mp3",
        "Obrero. -2":"Obrero. -2.mp3",
        "Achkam quñunakullasun nirqanitaq":"Achkam quñunakullasun nirqanitaq.mp3",
        "Phullu":"Phullu.mp3",
        "qam achahalata qhaway":"qam achahalata qhaway.mp3",
        "Shullk'aymi ganarqun kallpaypi":"Shullk'aymi ganarqun kallpaypi.mp3",
        "Ungüentuwan churaykachimuway":"Ungüentuwan churaykachimuway.mp3",
        "Aguila":"Aguila.mp3",
        "Anchayarunñam paypas":"Anchayarunñam paypas.mp3",
        "P'aqlapa cucharantachu wischurqapun":"P'aqlapa cucharantachu wischurqapun.mp3",
        "Exámen":"Exámen.mp3",
        "Tawa guitarrata apay fiestaman":"Tawa guitarrata apay fiestaman.mp3",
        "Qhaquy":"Qhaquy.mp3",
        "¿Enemiguykichu_":"¿Enemiguykichu_.mp3",
        "Fantasma barkuwan":"Fantasma barkuwan.mp3",
        "P'inqay":"P'inqay.mp3",
        "Vómito":"Vómito.mp3",
        "Ñañaykunawanmi":"Ñañaykunawanmi.mp3",
        "P'anqawan elefantita p'ampaykamuy":"P'anqawan elefantita p'ampaykamuy.mp3",
        "Chayarqamuspankupas":"Chayarqamuspankupas.mp3",
        "Pipa jabunnintataq mayu chinkarachin":"Pipa jabunnintataq mayu chinkarachin.mp3",
        "Khakuy":"Khakuy.mp3",
        "Centinela":"Centinela.mp3",
        "Rimaykachayninkunawanmi waqani":"Rimaykachayninkunawanmi waqani.mp3",
        "P'unqu":"P'unqu.mp3",
        "Racimupa phusuqunta ch'allay":"Racimupa phusuqunta ch'allay.mp3",
        "Cinemapi yachachiqta pusamuy":"Cinemapi yachachiqta pusamuy.mp3",
        "Centrupi akchi kashan":"Centrupi akchi kashan.mp3",
        "Imaynallam":"Imaynallam.mp3",
        "Obrero":"Obrero.mp3",
        "Chayaykuchkaptinkuñachusmi tusurqa":"Chayaykuchkaptinkuñachusmi tusurqa.mp3",
        "Guapa qhachunqa bañakuchkan":"Guapa qhachunqa bañakuchkan.mp3",
        "Gordo":"Gordo.mp3",
        "Sexo":"Sexo.mp3",
        "Chhalla":"Chhalla.mp3",
        "Ungüento":"Ungüento.mp3",
        "¿Bilingüe wawakunachu_":"¿Bilingüe wawakunachu_.mp3",
        "Mamaypa llikllachanta illariypi siray":"Mamaypa llikllachanta illariypi siray.mp3",
        "Centro":"Centro.mp3",
        "Azut'iwanmi juezqa maqakun":"Azut'iwanmi juezqa maqakun.mp3",
        "Taytachapa wasinman":"Taytachapa wasinman.mp3",
        "Ordenado":"Ordenado.mp3",
        "Yuyachiway":"Yuyachiway.mp3",
        "Dedo":"Dedo.mp3",
        "Antiguo":"Antiguo.mp3",
        "T'uqu":"T'uqu.mp3",
        "Thaka thaltatam huk joven vomitakuchkan":"Thaka thaltatam huk joven vomitakuchkan.mp3",
        "Extranjirupa ajedrizninta pakay":"Extranjirupa ajedrizninta pakay.mp3",
        "Azteca":"Azteca.mp3",
        "Yanqamanta thintiykachachkan":"Yanqamanta thintiykachachkan.mp3",
        "Dinosauriupa aychan":"Dinosauriupa aychan.mp3",
        "Lluqllam urqumanta chayaramun":"Lluqllam urqumanta chayaramun.mp3",
        "Yachariy":"Yachariy.mp3",
        "K'uytuy":"K'uytuy.mp3",
        "Junio killapiña casarakusun":"Junio killapiña casarakusun.mp3",
        "Arí":"Arí.mp3",
        "Q'ipi":"Q'ipi.mp3",
        "Basucatam t'uqyarqachin wak aqarway":"Basucatam t'uqyarqachin wak aqarway.mp3",
        "Khutuy":"Khutuy.mp3",
        "Octubre":"Octubre.mp3",
        "Uchuychallam bigote sapacha":"Uchuychallam bigote sapacha.mp3",
        "Punchawllaraqmiki kachkasqaqa":"Punchawllaraqmiki kachkasqaqa.mp3",
        "Antiguo edificium wakqa":"Antiguo edificium wakqa.mp3",
        "Phiñasqa yuthu":"Phiñasqa yuthu.mp3",
        "Feriapim rantirqaniku":"Feriapim rantirqaniku.mp3",
        "Juez":"Juez.mp3",
        "Oro":"Oro.mp3",
        "Elefante":"Elefante.mp3",
        "Hinaspa ñutumuy rumita":"Hinaspa ñutumuy rumita.mp3",
        "Chhapchiy":"Chhapchiy.mp3",
        "Huk shika lawa":"Huk shika lawa.mp3",
        "Escuelaq iqma directorninmi":"Escuelaq iqma directorninmi.mp3",
        "Convidar":"Convidar.mp3",
        "Auxilio":"Auxilio.mp3",
        "T'uqupi indio pakakusqa":"T'uqupi indio pakakusqa.mp3",
        "Isqun p'asñakunam ripukunku":"Isqun p'asñakunam ripukunku.mp3",
        "Examinar":"Examinar.mp3",
        "Willankim ñuqapa llakiyniykunamantapas":"Willankim ñuqapa llakiyniykunamantapas.mp3",
        "Patuman qaraykamuy":"Patuman qaraykamuy.mp3",
        "imaynatataq aguantasaq":"imaynatataq aguantasaq.mp3",
        "Escuela":"Escuela.mp3",
        "Paykunallawanchusmi":"Paykunallawanchusmi.mp3",
        "Qam achahalata qaway kusikuywan":"Qam achahalata qaway kusikuywan.mp3",
        "Guevara":"Guevara.mp3",
        "Phutiywanmi tarikuni":"Phutiywanmi tarikuni.mp3",
        "T'ikaqa ch'akispanmi q'iwikun":"T'ikaqa ch'akispanmi q'iwikun.mp3",
        "Carruqa wichikuykusqa machu qaqaman":"Carruqa wichikuykusqa machu qaqaman.mp3",
        "Shillarichinki viernes punchawta":"Shillarichinki viernes punchawta.mp3",
        "Zapato":"Zapato.mp3",
        "allinchay waq qilqata":"allinchay waq qilqata.mp3",
        "Ch'isim dinerunta gastarqun":"Ch'isim dinerunta gastarqun.mp3",
        "Thampi":"Thampi.mp3",
        "¿Imapaqtaq qillqaran willakuyta_":"¿Imapaqtaq qillqaran willakuyta_.mp3",
        "Luylu linguistam examinashan mayt'uta":"Luylu linguistam examinashan mayt'uta.mp3",
        "Llapa sipaskunata suwamuni":"Llapa sipaskunata suwamuni.mp3",
        "Manaraq wañuykunapas chayarqamuchkaptin":"Manaraq wañuykunapas chayarqamuchkaptin.mp3",
        "Shaphchiy":"Shaphchiy.mp3",
        "Isqunllaraq":"Isqunllaraq.mp3",
        "Jueves punchawta k'usilluta apamuy":"Jueves punchawta k'usilluta apamuy.mp3",
        "Guacamayutam tarirqamuni":"Guacamayutam tarirqamuni.mp3",
        "Lunq'u":"Lunq'u.mp3",
        "Vicuña":"Vicuña.mp3",
        "Sach'a":"Sach'a.mp3",
        "Killincham qaqapa uchkunpi puñuchkan":"Killincham qaqapa uchkunpi puñuchkan.mp3",
        "Barriga":"Barriga.mp3",
        "Aguita":"Aguita.mp3",
        "Excavación":"Excavación.mp3",
        "aklluq qipinpim phuchka":"aklluq qipinpim phuchka.mp3",
        "Manam Auxiliasunkichu":"Manam Auxiliasunkichu.mp3",
        "Asirichiway":"Asirichiway.mp3",
        "Obrerukuna wasita thuñichichkanku":"Obrerukuna wasita thuñichichkanku.mp3",
        "Ñaqaqa waqakachachkarqakuchus":"Ñaqaqa waqakachachkarqakuchus.mp3",
        "Sexo maskaypi kachkan":"Sexo maskaypi kachkan.mp3",
        "Ch'uñu":"Ch'uñu.mp3",
        "Ñuñu":"Ñuñu.mp3",
        "ampu masiykita puqllachimuy":"ampu masiykita puqllachimuy.mp3",
        "Pescado":"Pescado.mp3",
        "Ch'uklla":"Ch'uklla.mp3",
        "Chhuqchuy":"Chhuqchuy.mp3",
        "Enano":"Enano.mp3",
        "Qhaquykuway dinosauriupa agüitanwan":"Qhaquykuway dinosauriupa agüitanwan.mp3",
        "Thinti":"Thinti.mp3",
        "Unu":"Unu.mp3",
        "Sullka wawqiywan sirarachimuy":"Sullka wawqiywan sirarachimuy.mp3",
        "Chhira":"Chhira.mp3",
        "Sipasqa asikuchkasqa":"Sipasqa asikuchkasqa.mp3",
        "Cerillo":"Cerillo.mp3",
        "Aguerrida sipaskunas asikushanku":"Aguerrida sipaskunas asikushanku.mp3",
        "Sasachakuykunaqa":"Sasachakuykunaqa.mp3",
        "Garrapata":"Garrapata.mp3",
        "Suegruymi q'imichkan":"Suegruymi q'imichkan.mp3",
        "Kusirichiway":"Kusirichiway.mp3",
        "Aguilaq raphranmi chhallalla kasqa":"Aguilaq raphranmi chhallalla kasqa.mp3",
        "Richkankuñamiki imaynatapas":"Richkankuñamiki imaynatapas.mp3",
        "Lunq'ukunam gozakuchkanku":"Lunq'ukunam gozakuchkanku.mp3",
        "Jabón":"Jabón.mp3",
        "Guiñar":"Guiñar.mp3",
        "Sullk'a":"Sullk'a.mp3",
        "Basuraq ukhunpim tarini":"Basuraq ukhunpim tarini.mp3",
        "Shachaykuy wak sinvergüenza qarita":"Shachaykuy wak sinvergüenza qarita.mp3",
        "Generalqa excavaciunta orurayku ruwasqa":"Generalqa excavaciunta orurayku ruwasqa.mp3",
        "Papata khutuyachimuy":"Papata khutuyachimuy.mp3",
        "Taqsakuchkarqakuñam":"Taqsakuchkarqakuñam.mp3",
        "Saxuta alberguipi waqachichkanku":"Saxuta alberguipi waqachichkanku.mp3",
        "Barrigaypim qhiti kachurquwan":"Barrigaypim qhiti kachurquwan.mp3",
        "T'alla ñañachayqa allintam ñitikusqa":"T'alla ñañachayqa allintam ñitikusqa.mp3",
        "Ukhu":"Ukhu.mp3",
        "Shakawi garrapatam deduypi kachurquwan":"Shakawi garrapatam deduypi kachurquwan.mp3",
        "Lingüista":"Lingüista.mp3",
        "Chiri chupita timpuykachimuchkay":"Chiri chupita timpuykachimuchkay.mp3",
        "P'ankuy":"P'ankuy.mp3",
        "Llulla irqikuna niraq":"Llulla irqikuna niraq.mp3",
        "Vidrio":"Vidrio.mp3",
        "Paya hatu mamayqa kuyapacham":"Paya hatu mamayqa kuyapacham.mp3",
        "Phiwipa pantasqanta hurquy":"Phiwipa pantasqanta hurquy.mp3",
        "Pirwapi ukucha waqachkan":"Pirwapi ukucha waqachkan.mp3",
        "Ch'ukllapim enanuqa tiyashan":"Ch'ukllapim enanuqa tiyashan.mp3",
        "Ch'isi":"Ch'isi.mp3",
        "Grillo":"Grillo.mp3",
        "Payachayta pusamuy":"Payachayta pusamuy.mp3",
        "Guanacuta hapiy":"Guanacuta hapiy.mp3",
        "Fiesta":"Fiesta.mp3",
        "Difícil k'aptaymi camotipa yuranqa":"Difícil k'aptaymi camotipa yuranqa.mp3",
        "General":"General.mp3",
        "Shillariy":"Shillariy.mp3",
        "Thaka":"Thaka.mp3",
        "Kunanqa hakarayachkankuñataqchus":"Kunanqa hakarayachkankuñataqchus.mp3",
        "Qhali":"Qhali.mp3",
        "Thalta":"Thalta.mp3",
        "Aguerrida":"Aguerrida.mp3",
        "Kuyasqaytaqa qawaykullarqanim":"Kuyasqaytaqa qawaykullarqanim.mp3",
        "Chhapchiparquspan mikhukuchkan":"Chhapchiparquspan mikhukuchkan.mp3",
        "Conductor":"Conductor.mp3",
        "Basura":"Basura.mp3",
        "Ovejankunaqa enero killapiqa shachuyankum":"Ovejankunaqa enero killapiqa shachuyankum.mp3",
        "Uno":"Uno.mp3",
        "Abrazo":"Abrazo.mp3",
        "Phiñakuy":"Phiñakuy.mp3",
        "Falda":"Falda.mp3",
        "Phanqa":"Phanqa.mp3",
        "Khakuykamuy sarata":"Khakuykamuy sarata.mp3",
        "Qhachun":"Qhachun.mp3",
        "Allillanchu":"Allillanchu.mp3",
        "Ch'akisqa shach'ata llant'anki":"Ch'akisqa shach'ata llant'anki.mp3",
        "Mikhuy":"Mikhuy.mp3",
        "Llapan willakuykunata chayachinki":"Llapan willakuykunata chayachinki.mp3",
        "Bilingüe":"Bilingüe.mp3",
        "T'ika":"T'ika.mp3",
        "Guerraqa manam faciltachu tuñichirqa":"Guerraqa manam faciltachu tuñichirqa.mp3",
        "Qhurqu":"Qhurqu.mp3",
        "Manañam k'uytukachanqachu":"Manañam k'uytukachanqachu.mp3",
        "Vacapa umanpi takllata watasun":"Vacapa umanpi takllata watasun.mp3",
        "Paykunallataqa qawaykullasunmi":"Paykunallataqa qawaykullasunmi.mp3",
        "Guerra":"Guerra.mp3",
        "Thampi conductormi payqa":"Thampi conductormi payqa.mp3",
        "Grillukunata guisaramuy":"Grillukunata guisaramuy.mp3",
        "Sasachakuykunam atipawachkan":"Sasachakuykunam atipawachkan.mp3",
        "Uqu":"Uqu.mp3",
        "Abrazachkan khirkinchuta":"Abrazachkan khirkinchuta.mp3",
        "Muchanachakuykullasuntaqyá":"Muchanachakuykullasuntaqyá.mp3",
        "Gema":"Gema.mp3",
        "Dinero":"Dinero.mp3",
        "Arguedaspam Agua obraqa":"Arguedaspam Agua obraqa.mp3",
        "Qawanpi tusunki arisqa zapatuykiwan":"Qawanpi tusunki arisqa zapatuykiwan.mp3",
        "Cazador":"Cazador.mp3",
        "alquchaqa muskiyarqamuwan":"alquchaqa muskiyarqamuwan.mp3",
        "Guanacukunata arreamuchkanku nakanankupaq":"Guanacukunata arreamuchkanku nakanankupaq.mp3",
        "Ama sunquyta p'inqachiychu":"Ama sunquyta p'inqachiychu.mp3",
        "¿Wankakunapachu_":"¿Wankakunapachu_.mp3",
        "Chhuqchuy. -2":"Chhuqchuy. -2.mp3",
        "Antigüo gimnasiatayá":"Antigüo gimnasiatayá.mp3",
        "Sach'api chhuruykachachkasqa":"Sach'api chhuruykachachkasqa.mp3",
        "Q'ipiri niraq purin":"Q'ipiri niraq purin.mp3",
        "Chhirawan hallp'anchista hasp'irqamuy":"Chhirawan hallp'anchista hasp'irqamuy.mp3",
        "Llaqtamasichaykunapaq":"Llaqtamasichaykunapaq.mp3",
        "Aqachatayá rantiykamuy":"Aqachatayá rantiykamuy.mp3",
        "Wak maqtaqa kuyakuyta yacharqa":"Wak maqtaqa kuyakuyta yacharqa.mp3",
        "Wawqicha":"Wawqicha.mp3",
        "Dolurwan fiebrim qispirquwan":"Dolurwan fiebrim qispirquwan.mp3",
        "Shullka":"Shullka.mp3",
        "Ñuqa ripukullachkaniñam":"Ñuqa ripukullachkaniñam.mp3",
        "Q'illu":"Q'illu.mp3",
        "Aztecapa punchawninpim":"Aztecapa punchawninpim.mp3",
        "Terremoto chayarqamun":"Terremoto chayarqamun.mp3",
        "Ch'uspa":"Ch'uspa.mp3",
        "Thuta":"Thuta.mp3",
        "Casaca":"Casaca.mp3",
        "Brujuqa espejuyuqmi":"Brujuqa espejuyuqmi.mp3",
        "Ukuchakunallam yaykuykullanqaku":"Ukuchakunallam yaykuykullanqaku.mp3",
        "Carro":"Carro.mp3",
        "Kaniykusqaykichikrayku":"Kaniykusqaykichikrayku.mp3",
        "Tuñiy":"Tuñiy.mp3",
        "Wiksay rupachkan nina ratachkaq hina":"Wiksay rupachkan nina ratachkaq hina.mp3",
        "Girasol":"Girasol.mp3",
        "Uqi gemakunatam gustasqaku":"Uqi gemakunatam gustasqaku.mp3",
        "Lluqlla":"Lluqlla.mp3",
        "Yaw maqalla aqtuy chay chupita":"Yaw maqalla aqtuy chay chupita.mp3",
        "Cazadormi qalay cabizbajo purichkan":"Cazadormi qalay cabizbajo purichkan.mp3",
        "Pinguinuqa ordinawchallam purin":"Pinguinuqa ordinawchallam purin.mp3",
        "T'ustuy":"T'ustuy.mp3",
        "P'unqupi unuqa allillamantam t'impun":"P'unqupi unuqa allillamantam t'impun.mp3",
        "Arrear":"Arrear.mp3",
        "Chuychukusqam kay runa":"Chuychukusqam kay runa.mp3",
        "Chicharrunta tiqtinapaq":"Chicharrunta tiqtinapaq.mp3",
        "imanasqataq nanashan sunquyki":"imanasqataq nanashan sunquyki.mp3",
        "Gimnasia":"Gimnasia.mp3",
        "Tusurichiway":"Tusurichiway.mp3",
        "Frutakunaqa k'ukuraqmi kachkasqa":"Frutakunaqa k'ukuraqmi kachkasqa.mp3",
        "Llamkaysimunkichikchu":"Llamkaysimunkichikchu.mp3",
        "Ajedrez":"Ajedrez.mp3",
        "Casar":"Casar.mp3",
        "Kawsariy":"Kawsariy.mp3",
        "Aqakuypim girasol faldachanta suwasqa":"Aqakuypim girasol faldachanta suwasqa.mp3",
        "Uhuwan ñakarichkan":"Uhuwan ñakarichkan.mp3",
        "Pescawta laqu cuchulliwan khallay":"Pescawta laqu cuchulliwan khallay.mp3",
        "Octobripi mañakusqa taytachata":"Octobripi mañakusqa taytachata.mp3",
        "Qhali warmaqa t'ustusqam":"Qhali warmaqa t'ustusqam.mp3",
        "Qampa sunquykichu":"Qampa sunquykichu.mp3",
        "Tuniy":"Tuniy.mp3",
        "Cerilluwan chhillpaykunki":"Cerilluwan chhillpaykunki.mp3",
        "K'intushan q'umir cocapa raphinta":"K'intushan q'umir cocapa raphinta.mp3",
        "Oveja":"Oveja.mp3",
        "Gemelupa gusanun":"Gemelupa gusanun.mp3",
        "Khuyakuy":"Khuyakuy.mp3",
        "Illariy":"Illariy.mp3",
        "Cañonazo":"Cañonazo.mp3",
        "Yaw luqhi lazuy":"Yaw luqhi lazuy.mp3",
        "Takichakustillanmi, yaw":"Takichakustillanmi, yaw.mp3",
        "hamparata aqhawasiman apay":"hamparata aqhawasiman apay.mp3",
        "Juezta q'uchurichiy qhurqutyashan":"Juezta q'uchurichiy qhurqutyashan.mp3",
        "Llamkarikullachkasun":"Llamkarikullachkasun.mp3",
        "Wasichaykachipuwankichikmi":"Wasichaykachipuwankichikmi.mp3",
        "Dinosaurio":"Dinosaurio.mp3",
        "iquyasqan wiqrum":"iquyasqan wiqrum.mp3",
        "Llakipayaypaq ñuñushan":"Llakipayaypaq ñuñushan.mp3",
        "Guacamayo":"Guacamayo.mp3"
    }
};

function getRecordedServer() {
    resp = $.ajax({
        url: '/corpus/getRecordedS',
        cache: false,
        contentType: false,
        processData: false,
        type: 'GET',
        async: false
    });
    if (resp.statusText === 'OK') {
        return resp.responseJSON;
    }
    else {
        return {};
    }
}

function getRecordedWords() {
    var wordElements = document.querySelectorAll('.clip-label');
    var wordCounts = {};
    wordElements.forEach(function(wordElement) {
        var word = wordElement.innerText;
        if (!wordCounts.hasOwnProperty(word)) {
	          wordCounts[word] = 0;
        }
        wordCounts[word] += 1;
    });
    return wordCounts;
}

function getAllWantedWords() {
    var wordCounts = {};
    Object.keys(wantedWords[region]).forEach(function(word) {
        wordCounts[word] = 2;
    });
    return wordCounts;
}

function getRemainingWords() {
    var recordedCounts = getRecordedWords();
    var wantedCounts = getAllWantedWords();
    var remainingCounts = {};
    for (var word in wantedCounts) {
        wantedCount = wantedCounts[word];
        var recordedCount;
        if (recordedCounts.hasOwnProperty(word)) {
            recordedCount = recordedCounts[word];
        } else {
            recordedCount = 0;
        }
        var serverCount;
        if (recordedServer.hasOwnProperty(word)) {
            serverCount = recordedServer[word];
        } else {
            serverCount = 0;
        }
        var remainingCount = wantedCount - recordedCount - serverCount;
        if (remainingCount > 0) {
            remainingCounts[word] = remainingCount;
        }
    }
    return remainingCounts;
}

function unrollWordCounts(wordCounts) {
    var result = [];
    for (var word in wordCounts) {
        count = wordCounts[word];
        for (var i = 0; i < count; ++i) {
            result.push(word);
        }
    }
    return result;
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function getNextWord() {
    var remainingWords = unrollWordCounts(getRemainingWords());
    if (remainingWords.length == 0) {
        return null;
    }
    shuffleArray(remainingWords);
    return remainingWords[0];
}

function getProgressDescription() {
    var allWords = unrollWordCounts(getAllWantedWords());
    var remainingWords = unrollWordCounts(getRemainingWords());
    return ((allWords.length) - remainingWords.length) + "/" + allWords.length;
}

function updateProgress() {
    var progress = getProgressDescription();
    document.querySelector('.progress-display').classList.remove("countdown");
    document.querySelector('.progress-display').innerText = "Avance: " + progress;
}

function updateReadySend() {
    var sendThreshold = 1;
    var recordedWords = unrollWordCounts(getRecordedWords());
    if (recordedWords.length >= sendThreshold) {
        upload.disabled = false;
    }
    else {
        upload.disabled = true;
    }
}

function startRecording() {
    if (ignoreAutoPlay) {
        ignoreAutoPlay = false;
        return;
    }

    mediaRecorder.start();
    console.log(mediaRecorder.state);
    console.log("recorder started");
    record.style.background = "red";
    // setTimeout(endRecording, 45000);
}

// function endRecording() {
//     if (mediaRecorder.state == 'inactive') {
//         // The user has already pressed stop, so don't set up another word.
//         return;
//     }
//     var word = getNextWord();
//     if (word === null) {
//         promptToSave();
//         return;
//     }
//     document.querySelector('.info-display').innerText = word;
//     document.querySelector('.audio-hint').src = audios_hint + wantedWords[region][word];
//     updateProgress();
//     mediaRecorder.stop();
//     console.log(mediaRecorder.state);
//     console.log("recorder stopped");
//     record.style.background = "";
//     record.style.color = "";
//     setTimeout(startRecording, 1000);
// }

function promptToSave() {
    if (confirm('!Terminaste! ¿Listo para subir tus grabaciones?\n' +
	              'Presiona OK para iniciar el envio. Si quieres enviarlas luego presiona Cancelar\n' +
                ', con el boton "Enviar Audios"')) {
        saveRecordings();
    }
    upload.disabled = false;
}

var allClips;
var clipIndex;

function saveRecordings() {
    mediaStreamSource.disconnect();
    allClips = document.querySelectorAll('.clip');
    clipIndex = 0;
    uploadNextClip();
}

function uploadNextClip() {
    document.querySelector('.progress-display').innerText = 'Subiendo el clip ' +
	      clipIndex + '/' + unrollWordCounts(getRecordedWords()).length;
    var clip = allClips[clipIndex];
    clip.style.display = 'None';
    var audioBlobUrl = clip.querySelector('audio').src;
    var word = clip.querySelector('p').innerText;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', audioBlobUrl, true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
        if (this.status == 200) {
            var blob = this.response;
            var form = new FormData();
            form.append('word', word);
            form.append('data', blob);
            var uploadUrl = '/corpus/upload';
            $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
                jqXHR.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
            });
            $.ajax({
                url: uploadUrl,
                data: form,
                cache: false,
                contentType: false,
                processData: false,
                type: 'POST'
            }).done(function(response) {
                clipIndex += 1;
                if (clipIndex < allClips.length) {
                    uploadNextClip();
                }
                else {
                    // update how many actual remaining words there are
                    // getRemainingWords depends on the global variable recordedServer  ;( sorry!
                    recordedServer = getRecordedServer();
                    var remainingWords = unrollWordCounts(getRemainingWords());
                    if (remainingWords.length === 0) {
                        allDone();
                    }
                    else {
                        location.reload(true);
                    }
                }
            }).fail(function(xhreq, status, errorThrown) {
                alert('Hubo un error al enviar los audios: ' + status);
                console.log('Error thrown: ' + errorThrown);
            });
        }
    };
    xhr.send();
}

function allDone() {
    document.cookie = 'all_done=true; path=/';
    location.reload(true);
}

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
