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
let estado = '';
let menuPlayback;

const pathAudios = `sound:/${__dirname}/certificados/audios/gsm/audio`;

client.connect('http://localhost:8088', 'asterisk', 'asterisk', clientLoaded);

function clientLoaded(err, ari){
  if (err) {
    throw err; 
  }
  

  ari.on('StasisStart', function (event, incoming) {

    
    console.log('*****Se ha iniciado la aplicación*****', incoming.name);
    let  digit = null;
    mostrarMenu();
    async function mostrarMenu() {
        // Mostrar el menú
      incoming.answer(setTimeout((err) => {
        play(incoming, `sound:/${__dirname}/menuIntro`)
      }, 2000));
     
      console.log('---- Menu Inicio ---');
      console.log('Ingrese 1 para solicitar su certificado estudiantil.');
      console.log('Ingrese 2 para ver el estado de su solicitud.');
      incoming.on('ChannelDtmfReceived',  introMenu);
    
    }
       
        // Evaluar la opción seleccionada utilizando una estructura switch-case\
        
      async function introMenu(event, channel) {
        digit = event.digit;
       
          switch (digit) {
            case '1':
              if (menuPlayback) {
                menuPlayback.stop(function (err) {
                  if (err) {
                    console.error('Error al detener la reproducción de menuIntro:', err);
                  }
                });
              }
              console.log('Ha seleccionado la Opción 1');
              // Agrega el código que deseas ejecutar para la opción 1
              incoming.removeListener('ChannelDtmfReceived', introMenu);
                console.log('- Solicita tu certificado -');
              
                text='Por favor digite su cedula, codigo estudiantil y tipo de certificados seguidos se la tecla asterisco y finalice con la tecla numeral.';
                await generarAudio(text);
                await convertirAudio();
                await play(incoming,pathAudios);
                certificado(event, incoming);
              // Si deseas volver al inicio desde la opción 1, puedes establecer la opción en 0
                
              break;
            case '2':
              if (menuPlayback) {
                menuPlayback.stop(function (err) {
                  if (err) {
                    console.error('Error al detener la reproducción de menuIntro:', err);
                  }
                });
              }
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
              case '3':
                if (menuPlayback) {
                  menuPlayback.stop(function (err) {
                    if (err) {
                      console.error('Error al detener la reproducción de menuIntro:', err);
                    }
                  });
                }
                console.log('Ha seleccionado la Opción 3');
                incoming.removeListener('ChannelDtmfReceived', introMenu);
                console.log('- Llamando al servicio de Call Center -');
                text='Acontinuacion te conectaremos conectaremos con uno de nuestros agentes';
                await generarAudio(text);
                await convertirAudio();
                await play(incoming,pathAudios);
                llamarCallCenter(incoming);
                break;
            case '0':
              if (menuPlayback) {
                menuPlayback.stop(function (err) {
                  if (err) {
                    console.error('Error al detener la reproducción de menuIntro:', err);
                  }
                });
              }
              console.log('Volviendo al inicio...');
              
              break;
            default:
                console.log('Opción no válida. Inténtelo de nuevo.');
                text = 'opción no válida, inténtelo de nuevo'
                await generarAudio(text);
                await convertirAudio();
                play(channel, pathAudios)
          }
          
          if (digit === '0') {
            mostrarMenu();
            digit = null;

          
        }
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
  
  //function play(channel, sound, callback) {
    
    var stopPlayback = ari.stopPlayback;
    //playback.once('PlaybackFinished',
    //  function (event, instance) {

     //   if (callback) {
     //     callback(null);
     //   }
    //  });
   // channel.play({ media: sound }, playback, function (err, playback) { });
 // }
 function play(channel, sound, callback) {
  var playback = ari.Playback();
  playback.once('PlaybackFinished', function (event, instance) {
    if (callback) {
      callback(null);
    }
  });
  channel.play({ media: sound }, playback, function (err, playback) {
    if (!err) {
      menuPlayback = playback; // Asignar el objeto playback a la variable menuPlayback
    }
  });
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

            if(resultado.length!=0){
              console.log('Resultado Encontrado');
              estado = resultado[0].estado;
              switch (estado) {
                case 0:
                  console.log('solicitud pendiente');
                text = `su solicitud aun esta pendiente por aprobar`
                  break;
  
                case 1:
                  console.log('certificado generado');
                text = `su certificado ha sido generado`
                  break;
               
  
                case 2:
                  console.log('solicitud rechazada');
                 text = ` su solicitud ha sido rechazada`
                  break;
  
                default:
                  break;
              }
            }else{       
              text = `Usted no ha registrado ninguna solicitud`

            }

          
          })
          //.catch(text = 'La consulta realizada ha sido fallida, intente de nuevo')

        await generarAudio(text);
        await convertirAudio()

        query = '';
        await play(incoming, pathAudios);
        incoming.removeListener('ChannelDtmfReceived', consultaEstado);

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
  function llamarCallCenter(incoming) {
    console.log('Llamando al servicio de Call Center...');
    incoming.originate({
      endpoint: 'SIP/ext101', // Cambia el valor de '700' por la extensión correcta del Call Center
      context: '', // Cambia 'my-dialplan' por el nombre del contexto de tu dialplan
      context: '', // Cambia 'my-dialplan' por el nombre del contexto de tu dialplan
      extension: 'ext101', // Cambia '100' por la extensión en la que deseas realizar la llamada
      priority: 1,
      callerId: 'MiAplicacion'
    }, function (err, channel) {
      if (err) {
        console.error('Error al llamar al servicio de Call Center:', err);
        // Realiza alguna acción en caso de error al llamar al Call Center
        text = 'No ha sido posible contactar un agente, intente mas tarde'
      } else {
        console.log('Llamada realizada al servicio de Call Center');
        // Realiza alguna acción después de llamar al Call Center
        text = 'gracias por comunicarte con nosotros, hasta pronto'
      }
    });
  }
  
  function colgarLLamada(incoming) {
    setTimeout(function () {
      incoming.hangup()
    }, 2000);
  }

  ari.start('certificados');

}


