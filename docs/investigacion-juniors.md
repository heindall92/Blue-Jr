# Qué les falta a los juniors de SOC (noviembre de 2026)

Investigación que orienta la hoja de ruta de Blue-Jr desde la 0.4.0. Pregunta: ¿qué necesita un junior para su primer empleo en un SOC que no le dan los laboratorios y plataformas que ya existen?

## Lo que ya cubren otras plataformas

| Plataforma | Qué hace bien | Lo que no cubre |
|---|---|---|
| TryHackMe (SOC Level 1 y SOC Simulator) | Ruta guiada larga, Splunk integrado, cola de alertas con cronómetro y corrección del informe del caso con IA | En inglés, con cuenta y conexión; escenarios de horas |
| LetsDefend (Hack The Box desde 2025) | Catálogo grande de alertas y certificado | De pago para lo completo; parte de la comunidad lo ve poco realista como SOC |
| SOCSimulator | Turnos en tiempo real, ruido, SLA y MITRE; versión gratuita | En inglés y solo técnico |
| Blue Team Labs Online y CyberDefenders | Investigación profunda: forense, memoria, tráfico | Su propia documentación dice que no son el primer paso |
| EpicDetect | Investigación continua por episodios | De pago y en inglés |

Colas con verdaderos y falsos positivos, SLA, etiquetas MITRE e historias enlazadas ya existen. En español solo se encontraron cursos y talleres en vídeo, ningún simulador.

## Lo que les falta

1. **La IA se está quedando con el primer triaje.** En una encuesta de ISC2 de 2026, el 56 % de los profesionales que usan IA dice que ha reducido la necesidad de puestos de entrada. Los fabricantes coinciden en que el nivel 1 pasa a revisar veredictos de agentes y a cazar sus errores.
2. **Comunicación por encima de lo técnico.** Los responsables de contratación valoran escribir tickets, escalar y explicar a personas no técnicas; lo técnico se da por supuesto.
3. **Experiencia demostrable.** La mayoría de ofertas junior piden experiencia práctica; las certificaciones y los CTF no la demuestran en la entrevista.
4. **Bloqueo en el primer empleo.** Quienes empiezan cuentan que les cuesta investigar sin ayuda, no saben cuándo preguntar ni cuándo escalar y acusan la fatiga de alertas.

## Lo que Blue-Jr aporta, por orden

| Versión | Qué | Por qué |
|---|---|---|
| 0.4.0 | Revisión del agente de IA (nivel 1,5) | Nadie lo entrena y es hacia donde va el puesto |
| 0.4.0 | Triaje rápido diario con repaso espaciado | Los demás tienen escenarios de horas; esto crea el hábito diario |
| 0.5.0 | Comunicación corregida en local y «Pregunta al N2» con coste | Lo que más piden quienes contratan y lo que más bloquea al empezar |
| 0.6.0 | «Defiende tu ticket» y exportación STAR a Astrolabio | Convierte la práctica en experiencia que se puede contar |
| 0.7.0 | Contexto español: RGPD (72 horas), ENS e INCIBE-CERT | Ningún laboratorio en inglés lo tiene y conecta con el ecosistema GRC |

Los turnos con reloj (SLA) bajan de prioridad: SOCSimulator y TryHackMe ya los tienen.

## Fuentes

- EpicDetect, *LetsDefend Review 2026: Price, Free Tier and Alternatives*: https://epicdetect.io/blogs/letsdefend-alternatives-soc-training-2026
- CyberDefenders, *Best Cyber Range Platforms*: https://cyberdefenders.org/blog/best-cyber-range-platforms/
- SOCSimulator, *SOCSimulator vs LetsDefend (2026)*: https://www.socsimulator.com/compare/vs-letsdefend
- TryHackMe, *SOC SIM*: https://help.tryhackme.com/en/articles/10508054-soc-sim y *Our NEW! SOC Simulator*: https://tryhackme.com/resources/blog/soc-simulator-launch
- Strike48, *SOC Tiers: Tier 1, 2 & 3 Analyst Roles + Where AI Fits* (cita la encuesta de ISC2 de 2026): https://www.strike48.com/post/soc-tiers
- Secure.com, *What Are the 3 Tiers of SOC?*: https://www.secure.com/blog/soc/soc-tiers-explained
- CyberDesserts, *What Skills SOC Hiring Managers Test For In Interviews*: https://blog.cyberdesserts.com/soc-analyst-interview/
- EpicDetect, *Why Entry-Level Cyber Jobs Aren't Really Entry-Level*: https://epicdetect.io/blogs/why-entry-level-cyber-jobs-arent-entry-level
- ISC2, *Cybersecurity Hiring Trends*: https://www.isc2.org/Insights/2025/06/cybersecurity-hiring-trends-study
- Reddit r/SecurityCareerAdvice, *SOC Analyst feel like I am not learning and an imposter*: https://www.reddit.com/r/SecurityCareerAdvice/comments/1iz3smu/

Las cifras y precios son los publicados por cada fuente en la fecha de consulta.
