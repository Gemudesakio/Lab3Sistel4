'use strict'

const client = require('ari-client');

const generarAudio = require('./funciones/gtts');
const convertirAudio = require('./funciones/sox');
const { connection, consultasDB } = require('./db');

//---------------------------------------------------

let cedula = '';
let datosUsuario = '';
let cedulaU = '';
let fecha = '';
let query = '';
let resultado = '';
let text = '';
let tipoCertificado = '';
let codigo = '';

const pathAudios = `sound:/${__dirname}/certificados/audios/gsm/audio`;

client.connect('http://localhost:8088', 'asterisk', 'asterisk', clientLoaded);

function clientLoaded(err, ari){
  if (err) {
    throw err; 
  }
  

  ari.on('StasisStart', function (event, incoming) {

    
    console.log('*****Se ha iniciado la aplicación*****', incoming.name);
    let  digit = null;
     do {
      // Mostrar el menú
      incoming.answer(setTimeout((err) => {
        play(incoming, `sound:/${__dirname}/menuIntro`)
      }, 2000));
     
      console.log('---- Menu Inicio ---');
      console.log('Ingrese 1 para solicitar su certificado estudiantil.');
      console.log('Ingrese 2 para ver el estado de su solicitud.');
      console.log('Antes del retraso');
      incoming.on('ChannelDtmfReceived',  introMenu);

      
        // Evaluar la opción seleccionada utilizando una estructura switch-case\
      } while (digit === '0');
      async function introMenu(event, channel) {
        digit = event.digit;
       
          switch (digit) {
            case '1':
              console.log('Ha seleccionado la Opción 1');
              // Agrega el código que deseas ejecutar para la opción 1
              incoming.removeListener('ChannelDtmfReceived', introMenu);
                console.log('- Solicita tu certificado -');
                setTimeout(() => console.log('Después del retraso'), 5000);
                text='Por favor digite su cedula, codigo estudiantil y tipo de certificados seguidos se la tecla asterisco y finalice con la tecla numeral.';
                await generarAudio(text);
                await convertirAudio();
                await play(incoming,pathAudios);
                certificado(event, incoming);
              // Si deseas volver al inicio desde la opción 1, puedes establecer la opción en 0
                
              break;
            case '2':
              console.log('Ha seleccionado la Opción 2');
              // Agrega el código que deseas ejecutar para la opción 2
              incoming.removeListener('ChannelDtmfReceived', introMenu);
                console.log('- consulta el estado de tu solicitud -');
                text='Por favor digite su cédula, seguida de la tecla numeral.';
                await generarAudio(text);
                await convertirAudio();
                await play(incoming,pathAudios);
                estado(event, incoming, channel);
              // Si deseas volver al inicio desde la opción 2, puedes establecer la opción en 0
                
              break;
            case '0':
              console.log('Volviendo al inicio...');
              
              break;
            default:
              console.log('Opción no válida. Inténtelo de nuevo.');
                text = 'opción no válida, inténtelo de nuevo'
                await generarAudio(text);
                await convertirAudio();
                play(channel, pathAudios)
          }
          return digit 
        }
      
   

    
    function estado(event, incoming, channel) {
      cedula = '';
      console.log('---------consulta estado certificado---------');
      incoming.on('ChannelDtmfReceived', consultaEstado);
    }

    function certificado(event, incoming) {
      datosUsuario = '';
      console.log('---------Solicitar Certificado---------');
      incoming.on('ChannelDtmfReceived', solicitudCertificado);
    }

    /*function agente(event, incoming) {
        console.log('---------Agente---------');
        incoming.on('ChannelDtmfReceived', agente);
    }*/

  });


  /**
   *  Initiate a playback on the given channel.
   *
   *  @function play
   *  @memberof example
   *  @param {module:resources~Channel} channel - the channel to send the
   *    playback to
   *  @param {string} sound - the string identifier of the sound to play
   *  @param {Function} callback - callback invoked once playback is finished
   */
  
  function play(channel, sound, callback) {
    var playback = ari.Playback();
    playback.once('PlaybackFinished',
      function (event, instance) {

        if (callback) {
          callback(null);
        }
      });
    channel.play({ media: sound }, playback, function (err, playback) { });
  }

  async function consultaEstado(event, incoming) {

    let dato = event.digit;

    // Grabacion de peticion de cedula y marcacion de #.
    switch (dato) {
      case '#':
        incoming.removeListener('ChannelDtmfReceived', consultaEstado);
        query = `SELECT estado FROM certificados WHERE cedulaUsuario = ${cedula} LIMIT 1`

        resultado = await consultasDB(query)
          .then(function (resultado) {

            if (!resultado) return

            switch (resultado.resultado) {
              case 0:
                text = `${resultado.nombre} solicitud pendiente`
                break;

              case 1:
                text = `${resultado.nombre} certificado generado`
                break;

              case 2:
                text = `${resultado.nombre} solicitud rechazada`
                break;

              default:
                break;
            }
          })
          .catch(text = 'La consulta realizada ha sido fallida, intente de nuevo')

        await generarAudio(text);
        await convertirAudio()

        query = '';
        await play(incoming, pathAudios);
        incoming.removeListener('ChannelDtmfReceived', agendarCita);

        setTimeout(function () {
          colgarLLamada(incoming);
        }, 5000)

        break;

      case '*':
        console.log('---------consulta estado certificado---------');
        cedula = '';
        incoming.removeListener('ChannelDtmfReceived', consultaEstado);
        incoming.on('ChannelDtmfReceived', consultaEstado)
        break

      default:
        cedula += dato;
        console.log('guardando cedula');
        console.log(cedula);
        break;
    }
  }


  async function solicitudCertificado(event, incoming) {

    let dato = event.digit;

    switch (dato) {
      case '#':
        incoming.removeListener('ChannelDtmfReceived', solicitudCertificado);

        datosUsuario = datosUsuario.split('*');
        cedulaU = datosUsuario[0];
        codigo = datosUsuario[1];
        tipoCertificado = datosUsuario[2];

        query = `INSERT INTO certificados (cedulaUsuario, tipoCertificado, estado, codigo) VALUES ('${cedulaU}', '${tipoCertificado}', '0','${codigo}')`;

        await consultasDB(query)
          .then(async function () {

            text = 'Su certificado ha sido solicitado correctamente.'
          })
          .catch(function () {
            text = 'No se ha podido generar certificado, inténtelo de nuevo'
          });

        await generarAudio(text);
        await convertirAudio()
        await play(incoming, pathAudios);


        await setTimeout(function () {
          colgarLLamada(incoming);
        }, 5000)

        query = '';
        cedulaU = '';
        codigo = '';
        tipoCertificado = '';
        datosUsuario = '';
        break;

      default:
        datosUsuario += dato;
        console.log('guardando datos de cita');
        console.log(datosUsuario);
        break;
    }
  }

  function colgarLLamada(incoming) {
    setTimeout(function () {
      incoming.hangup()
    }, 2000);
  }

  ari.start('certificados');

}