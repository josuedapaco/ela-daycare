/**
 * Preguntas frecuentes, en un solo sitio.
 *
 * De aquí salen las dos cosas a la vez: el acordeón que se ve en la página y el
 * JSON-LD de FAQPage que lee Google. Si se escribieran por separado acabarían
 * diciendo cosas distintas, y Google penaliza el schema que no coincide con el
 * texto visible. Va en JavaScript plano y en la raíz porque lo importan tanto
 * el build de Astro como el servidor Express — ver datos/negocio.js.
 */
export const faqs = [
  {
    es: {
      q: '¿Preguntan por mi estatus migratorio?',
      a: 'No. Nunca lo preguntamos, no lo anotamos en ningún papel y no lo necesitamos para recibir a tu hijo. Los programas 3-K y Pre-K de la ciudad tampoco lo piden.',
    },
    en: {
      q: 'Do you ask about my immigration status?',
      a: "No. We never ask, we don't record it anywhere, and we don't need it to welcome your child. The city's 3-K and Pre-K programs don't ask either.",
    },
  },
  {
    es: {
      q: '¿Esto es una casa de familia o una guardería de verdad?',
      a: 'Las dos cosas, y por eso funciona. Es una casa, y es un group family daycare con licencia del estado de Nueva York (OCFS): la casa se inspecciona, las cuidadoras se capacitan y se certifican, y hay reglas de capacidad que no se pueden pasar. La diferencia con un centro no es la seriedad, es el tamaño.',
    },
    en: {
      q: 'Is this someone\'s home or a real day care?',
      a: "Both, and that's why it works. It's a home, and it's a group family daycare licensed by New York State (OCFS): the home gets inspected, the caregivers are trained and certified, and there are capacity rules that can't be exceeded. The difference from a center isn't seriousness — it's size.",
    },
  },
  {
    es: {
      q: '¿Cuántos niños hay y de qué edades?',
      a: 'Somos un daycare familiar para niños de 6 semanas a 12 años, con un máximo de 12 niños en total. Consulta con Fanny los cupos disponibles según la edad de tu hijo y la capacidad autorizada.',
    },
    en: {
      q: 'How many children are there, and what ages?',
      a: 'We are a family daycare for children ages 6 weeks to 12 years, with a maximum of 12 children in total. Ask Fanny about openings for your child’s age and authorized capacity.',
    },
  },
  {
    es: {
      q: '¿Es bueno que mi bebé esté con niños más grandes?',
      a: 'Es una de las razones por las que las familias vienen. Los bebés aprenden viendo a los grandes, y los grandes aprenden a cuidar. Los bebés tienen su propio espacio para dormir y comer tranquilos, pero el resto del día es una casa con hermanos, no un salón de doce bebés iguales.',
    },
    en: {
      q: 'Is it good for my baby to be with older children?',
      a: "It's one of the reasons families come. Babies learn by watching the older ones, and the older ones learn to care for someone. Babies have their own space to sleep and eat in peace, but the rest of the day it's a house full of siblings, not a room of twelve identical babies.",
    },
  },
  {
    es: {
      q: '¿Qué pasa si te enfermas o cierras un día?',
      a: 'Fanny es quien está a cargo del cuidado diario. Consúltale directamente cómo se organizan las ausencias y los días de cierre antes de inscribir a tu hijo.',
    },
    en: {
      q: 'What if you get sick or close for a day?',
      a: "Fanny is responsible for daily care. Ask her directly about arrangements for absences and closing days before enrolling your child.",
    },
  },
  {
    es: {
      q: '¿Puedo ver a mi hijo durante el día?',
      a: 'Puedes entrar cuando quieras, sin avisar, a cualquier hora. Además te mandamos fotos y el reporte del día por mensaje. No tenemos nada que esconder.',
    },
    en: {
      q: 'Can I see my child during the day?',
      a: 'You can walk in whenever you want, unannounced, any time. We also text you photos and the daily report. We have nothing to hide.',
    },
  },
  {
    es: {
      q: '¿Qué pasa si llego tarde a recoger?',
      a: 'Cobramos $1 por minuto después de las 5:30, y lo decimos claro para que nadie se lleve una sorpresa. Pero si se te complicó el tren, llámanos: ningún niño se queda solo y la primera vez no se cobra.',
    },
    en: {
      q: "What if I'm late for pickup?",
      a: 'We charge $1 per minute after 5:30, and we say it plainly so nobody is surprised. But if the train held you up, call us: no child is ever left alone, and the first time is free.',
    },
  },
];
