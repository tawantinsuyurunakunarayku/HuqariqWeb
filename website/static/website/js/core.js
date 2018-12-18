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

var wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'blue',
  progressColor: 'purple'
});

wavesurfer.load(audio_filename);
// Para fines de correccion de transcripciones.
// Cargamos la transcripcion que tenemos y la inyectamos en el form.txt
fetch(audio_filename.slice(0, -3) + 'txt').then(response => response.text()).then(text => $("#id_text").val(text));

var duration = 1.2;
var region = null;

wavesurfer.on('ready', function () {
  duration = wavesurfer.getDuration();
  //console.log(duration);

  var timeline = Object.create(WaveSurfer.Timeline);
  timeline.init({
    wavesurfer: wavesurfer,
    container: '#waveform-timeline',
    timeInterval: 1,
    primaryLabelInterval: 10,
    secondaryLabelInterval: 2
  });

  // Enable creating regions by dragging
  wavesurfer.enableDragSelection({});
  region = wavesurfer.addRegion({
    start: 0, // time in seconds
    end: duration, // time in seconds
    color: 'hsla(100, 100%, 30%, 0.1)',
    drag: false,
    resize: false,
  });

  d3.select("#id_start").attr("value",0);
  d3.select("#id_end").attr("value", Math.round(duration*10000.0)/10000.0 );

  //var px_sec = ($("#waveform")[0].offsetWidth) / duration;
  //console.log(px_sec);
  //wavesurfer.zoom(px_sec);
});


////////////////////

var slider = d3.slider().value([0,100]);
slider.on("slide",function(evt,value){
    var st = (value[0]*duration)/100.0;
    var ed = (value[1]*duration)/100.0;
    region.update({
      start: st,
      end: ed
    });
    st = Math.round(st*10000.0)/10000.0;
    ed = Math.round(ed*10000.0)/10000.0;
    d3.select("#id_start").attr("value",st);
    d3.select("#id_end").attr("value",ed);
    //console.log(value[0],(value[0]*duration)/100.0);
    //console.log(value[1], (value[1]*duration)/100.0);
  });

d3.select("#rangeslider").call(slider);
////

$('#main-form input[name=quality]').on('change',function(){
  var val = $('#main-form input[name=quality]:checked').val();
  val = parseInt(val);
  var text = $("#id_text").val();
  if (val>2){
    $("#id_text").prop("disabled",true);
    $("#spellchk-btn").prop("disabled",true);
    if (text.length==0)
      $("#id_text").val("transcripcion no disponible");
  }else{
    $("#id_text").prop("disabled",false);
    $("#spellchk-btn").prop("disabled",false);
    if (text=="transcripcion no disponible")
      $("#id_text").val("");
  }

});


/////////////////////////////////////////////////

$("#main-form").submit(function(e){
  e.preventDefault();
  if ( $("#id_text")[0].hasAttribute("disabled") ){
    $("#id_text").prop("disabled",false);
  }

  this.submit();
});

Example.init({
    "selector": ".bb-alert"
});


$("#submit-btn").on("click",function(e){
  console.log("entra log!");

  bootbox.confirm({
    message: "¿Enviar transcripción?",
    buttons: {
      confirm: {
        label: "Confirmar",
        className: "btn-success"
      },
      cancel: {
        label: "Cancelar",
        className: "btn-danger"
      }
    },
    callback: function (result) {
      if (result){
        $("#main-form").submit();
        //Example.show('Transcripción enviada!');
      }else{
        console.log('This was logged in the callback: ' + result);
      }
    }
  });

});

if ($("#id-suc").data("succedded")=="True"){
  Example.show('Transcripción enviada con éxito!');
}else if ($("#id-suc").data("save-error")=="True"){
  Example.show('Error al enviar transcripción.');
}

if ($("#norm-text").text().length == 0){
  $("#use-btn").prop("disabled",true);
}else{
  $("#use-btn").prop("disabled",false);
}
