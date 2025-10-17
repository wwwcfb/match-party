// testSendMessage.js
import { sendMessage } from './utils/supabaseHelpers.js';

// IDs de usuarios de prueba
const senderId = 'a3a8c867-4827-41f9-a785-33f6886120fc';   // "prueba casa"
const receiverId = '7e07e213-ab3f-473f-be8d-2fb95bedbb68'; // "prueba casa 2"
const text = '¡Hola! Este es un mensaje de prueba desde testSendMessage.js';

async function testSendMessage() {
  try {
    const message = await sendMessage(senderId, receiverId, text);
    console.log('Mensaje enviado con éxito:', message);
  } catch (error) {
    console.error('Error al enviar mensaje:', error.message);
  }
}

// Ejecutar la prueba
testSendMessage();
