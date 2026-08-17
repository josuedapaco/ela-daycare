/**
 * Los datos duros del daycare, en un solo sitio.
 *
 * Lo lee tanto el build de Astro (la página y el JSON-LD) como el servidor
 * Express (el resumen de /llms.txt). Por eso vive en la raíz y no en `src/`:
 * la imagen de Docker solo copia `server.js` y `dist/`, así que si estuviera
 * dentro de `src/` el servidor no lo encontraría en producción.
 *
 * Está en JavaScript plano, sin tipos, para que Node lo pueda importar tal cual.
 */

export const negocio = {
  nombre: "Emanuel's Little Angels Family Group Daycare",
  nombreCorto: 'ELA Daycare',
  duenya: 'Fanny Torres',
  abrioEn: 2023,
  licencia: 'NY OCFS Group Family Day Care #948701',
  direccion: '74-18 87 Ave, Woodhaven, Queens, NY 11421',
  telefono: '+1 (347) 369-0961',
  correo: 'fannytorres1979@gmail.com',
  web: 'https://eladaycare.com',
  horario: { abre: '7:00am', cierra: '6:00pm', dias: 'lunes a viernes', finDeSemana: 'cerrado' },
  idiomas: ['español', 'inglés'],
  transporte: 'Líneas J y Z del metro en Woodhaven Blvd',
  visitas: 'Sin cita, de lunes a viernes entre 9:30 y 11:00 de la mañana',
};

/** Grupos por edad. Las claves coinciden con las de vacancies.json. */
export const grupos = [
  { clave: 'babies', es: 'Bebés', en: 'Babies', edadEs: '6 semanas a 18 meses', edadEn: '6 weeks to 18 months' },
  { clave: 'toddlers', es: 'Caminadores', en: 'Toddlers', edadEs: '18 meses a 3 años', edadEn: '18 months to 3 years' },
  { clave: 'angels', es: 'Angelitos · 3-K', en: 'Little Angels · 3-K', edadEs: '3 a 5 años', edadEn: '3 to 5 years' },
  { clave: 'afterschool', es: 'Después de escuela', en: 'After school', edadEs: '5 a 12 años', edadEn: '5 to 12 years' },
];

/**
 * La rutina diaria tal y como la tiene escrita Fanny. De aquí sale la lista que
 * se ve en la página y el resumen que leen las IA: escribirla dos veces es
 * justo como el sitio acabó anunciando un horario que no era el real.
 */
export const rutina = [
  { hora: '7:00', es: 'Se abre la puerta: bienvenida y juego tranquilo con rompecabezas, libros y bloques.', en: 'The door opens: welcome, and quiet play with puzzles, books and blocks.' },
  { hora: '8:00', es: 'Desayuno en la mesa de la cocina.', en: 'Breakfast at the kitchen table.' },
  { hora: '8:30', es: 'Círculo de la mañana: saludos, el calendario, el clima, canciones y el tema del día.', en: 'Morning circle: greetings, the calendar, the weather, songs and the theme of the day.' },
  { hora: '9:00', es: 'Aprendizaje: lectura, arte, los primeros números, ciencias y lenguaje.', en: 'Learning time: reading, art, early math, science and language.' },
  { hora: '10:00', es: 'Merienda de la mañana.', en: 'Morning snack.' },
  { hora: '10:15', es: 'Salimos al patio o caminamos al parque del barrio: correr, trepar, moverse.', en: 'Out to the yard, or a walk to the neighborhood park: running, climbing, moving.' },
  { hora: '11:30', es: 'Almuerzo caliente, cocinado aquí esa misma mañana.', en: 'A hot lunch, cooked right here that morning.' },
  { hora: '12:00', es: 'Nos preparamos para dormir: lectura tranquila y música suave.', en: 'Getting ready to sleep: quiet reading and soft music.' },
  { hora: '12:30', es: 'Siesta, con la luz baja. Los bebés duermen a su hora.', en: 'Nap time, lights low. Babies sleep on their own schedule.' },
  { hora: '2:30', es: 'Se despiertan poco a poco, sin apurar a nadie.', en: 'They wake up slowly, nobody gets rushed.' },
  { hora: '3:00', es: 'Merienda de la tarde, y llegan los grandes de la escuela.', en: 'Afternoon snack, and the big kids arrive from school.' },
  { hora: '3:30', es: 'Centros: arte, juego dramático, construcción, sensorial y STEM. Los grandes hacen la tarea acompañados.', en: 'Centers: art, dramatic play, building, sensory and STEM. The big kids do homework with support.' },
  { hora: '4:30', es: 'Juego libre todos juntos, dentro o en el patio.', en: 'Free play, everyone together, inside or in the yard.' },
  { hora: '5:15', es: 'Despedida: te contamos cómo le fue el día. Cerramos a las 6:00.', en: 'Goodbyes: we tell you how the day went. We close at 6:00.' },
];

/** Datos que las familias preguntan y que conviene que una IA pueda citar. */
export const hechos = [
  {
    es: 'Licencia de group family day care del estado de Nueva York (OCFS) #948701. La casa se inspecciona y las cuidadoras se certifican.',
    en: 'Licensed group family day care by New York State (OCFS), license #948701. The home is inspected and the caregivers are certified.',
  },
  {
    es: 'Hasta 12 niños de 6 semanas a 12 años, más hasta cuatro niños de edad escolar adicionales. Dos adultos certificados presentes todo el día; para menores de 2 años, un adulto por cada dos niños.',
    en: 'Up to 12 children ages 6 weeks to 12 years, plus up to four additional school-age children. Two certified adults present all day; for children under 2, one adult per two children.',
  },
  {
    es: 'Bilingüe: se habla español e inglés desde la primera semana.',
    en: 'Bilingual: Spanish and English from the very first week.',
  },
  {
    es: 'Acepta el programa 3-K de la ciudad de Nueva York y vales de ACS y HRA. Ayudamos con la solicitud, en español y sin costo.',
    en: "Accepts New York City's 3-K program and ACS and HRA vouchers. We help with the application, in Spanish, at no charge.",
  },
  {
    es: 'Nunca preguntamos por el estatus migratorio, ni lo anotamos en ningún papel.',
    en: 'We never ask about immigration status, and we never write it down anywhere.',
  },
  {
    es: 'La comida se cocina cada mañana en la misma cocina donde comen los niños. El menú de la semana se publica los viernes y se adapta a alergias.',
    en: 'Food is cooked every morning in the same kitchen where the children eat. The weekly menu is posted on Fridays and adapts to allergies.',
  },
  {
    es: 'Los padres pueden entrar cuando quieran, sin avisar, a cualquier hora. Se manda foto y reporte del día por mensaje.',
    en: 'Parents can walk in whenever they want, unannounced, any time. We text a photo and the daily report.',
  },
  {
    es: 'Recogida tarde: $1 por minuto después de las 6:00. La primera vez no se cobra.',
    en: 'Late pickup: $1 per minute after 6:00. The first time is free.',
  },
  {
    es: 'Días sin clases, medio día y vacaciones escolares: abrimos igual.',
    en: 'No-school days, half days and school breaks: we are open anyway.',
  },
];
