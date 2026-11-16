# NASA Space Apps 2026 challenge

**Challenge:** *Create Health Monitoring Software for Astronauts on Space Missions*

**Official page:** <https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/>

**Event:** NASA Space Apps Challenge 2026, global theme “The Next Frontier”, November 14–15, 2026. Difficulty: intermediate. Fields: software and space exploration.

[Español](../es/challenge.md) · [Documentation](README.md)

> Original note dated November 14, 2026. The user copied the challenge and **Resources** tab from the official page because it could not be reached from the development machine. This document translates that project record; it does not independently verify the event information.

## Official challenge


> **Create Health Monitoring Software for Astronauts on Space Missions**
>
> Long-duration missions expose astronauts to space radiation, isolation and confinement, altered gravity, and a hostile closed environment, which can bring immune changes, bone loss, cardiovascular events, and behavioral health problems. On long missions, astronauts carry much of the responsibility for spotting these changes in themselves. Your challenge is to build a health monitoring software that gathers health indicators and enables astronauts to evaluate and act on the status of their health.

### Background

> With rising investment in spacecraft technology and research, space missions have become more ambitious. NASA’s Artemis program recently accomplished a crewed lunar flyby, and NASA and others have plans to send humans to Mars in the future. With increasingly longer missions, astronauts will be more exposed to the hostile space environment, which brings both physical and mental health risks.
>
> NASA’s Human Research Program has mapped the five hazards of human spaceflight, which are space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile closed environments. These hazards can contribute to health problems such as immune system changes, bone density loss, cardiovascular events, inadequate nutrition, behavioral health conditions, and others. Astronauts must be capable of making health assessments on themselves during a mission, to prevent and treat health problems that may arise. Some useful health indicators are blood pressure, heart rate, blood sugar, body temperature, daily sleep hours, and mood.

### Objectives

> Your challenge is to create a visual tool that helps astronauts assess their own health during space missions and provides guidance on treatments and health improvements. You may consider gathering data from the user through any kind of input—keyboard text, mouse clicks, or camera images, for example. Any kind of data can be used, as long as it represents a health indicator, such as blood sugar levels in mg/dL or ultrasound images.
>
> You can use NASA’s Human Research Program resources, along with the publicly available resources from other space agencies, to understand how spaceflight hazards affect human health, and to decide which indicators are useful and how they can support a quick assessment. Which measurements can be performed in space? Why is an exam needed? How do spaceflight hazards affect these health indicators? When might a result warrant attention from the crew or from flight surgeons on the ground? What actions can be taken to prevent a critical health condition? These are questions worth considering as you develop your solution.
>
> User interface design plays an important role in presenting metrics and diagnosis clearly. You may consider taking advantage of animations and interactivity to present the information. For example, the software could display a human figure where each part of the body is clickable and displays information about its function and health status.

### Potential Considerations

> You may (but are not required to) consider the following:
>
> - Your tool could provide health insights for astronauts in different environments, such as a spacecraft, a space station, a rover, or a base on another planet or moon.
> - Your tool could prompt astronauts to take measurements or complete specific actions from time to time as a part of the mission routine.
> - Your tool could include the following features:
>   - A gamification system to help astronauts engage with tasks that support their health
>   - Dynamic charts that show how astronaut’s health indicators change over time
>   - Color coding that helps the astronaut interpret the status of a health indicator at a glance
> - Do not assume that astronauts know everything about how to assess their health. Your tool could provide simple instructions and explanations covering measurements, health indicators, and risks.
>
> For data and resources related to this challenge, refer to the Resources tab at the top of the page. More resources may be added before the hackathon begins.



## Overview

- **Problem:** on long missions, astronauts must recognize changes in their own physical and mental health caused by the space environment.
- **Context:** the supplied challenge describes a crewed Artemis lunar flyby and plans for Mars. NASA HRP identifies five hazards: **radiation, isolation and confinement, distance from Earth, gravity fields, and hostile closed environments**. They can contribute to immune changes, bone loss, cardiovascular events, inadequate nutrition and behavioral health problems ([NASA HRP](https://www.nasa.gov/hrp/hazards/)).
- **Suggested indicators:** blood pressure, heart rate, blood glucose, body temperature, daily sleep hours and mood.
- **Objective:** a **visual tool** for self-assessment, with **guidance on treatments and health improvements**. Any input is allowed, including text, clicks and camera images, provided it represents a health indicator, such as glucose in mg/dL or ultrasound images.
- **Research:** use NASA HRP and other agencies’ resources to select useful indicators for **quick assessment**.
- **Guiding questions:** which measurements are feasible in space, why an exam is needed, how hazards affect each indicator, when crew or ground flight surgeons should be notified, and which actions can prevent a critical condition.
- **Interface:** a clickable human figure showing function and health status, animation and interactivity.
- **Optional features:** different mission environments (spacecraft, station, rover, base), routine reminders, gamification, dynamic charts, color coding and simple explanations.
- **Resources:** the official page’s Resources tab.

## Official challenge resources

Copied from the official page by the user.

| Resource | Description | Use in SIMISA |
| --- | --- | --- |
| [NASA · 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) | HRP hazard overview with links to articles and reports | **Used:** all five hazards in Medical information and the per-indicator guide (`shared/health-guide.js`) |
| [NASA · Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) | HRP health risk overview with links by risk | **Used:** nine cited risks: cardiovascular, fitness, hypoxia, immune response, nutrition, bone, sleep, behavior and teamwork |
| [NASA · Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Articles on ongoing HRP research | Linked under Sources |
| [CSA · Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Canadian radiation monitoring research and technology | Linked under Sources; synthetic dosimeter and dose rate in µSv/h, without validation or safety thresholds derived from this source |
| [CSA · Why Do We Conduct Science Experiments in Space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | How ISS research supports health and exploration | Linked under Sources |

NASA HRP pages were consulted on November 14, 2026; CSA pages did not respond from the development machine.

## Other sources consulted

- The Belo Horizonte event guide states that **at least one resource from the Resources tab must be used for global awards** ([BH 2026 challenge PDF](https://santamaria.pucminas.br/wp-content/uploads/2026/11/Desafios-NASA-Space-Apps-Challenge-BH-2026.pdf)).
- A public discussion indicated that challenge resources would be published on November 13, 2026 ([nasa/spaceapps · Discussion #1772](https://github.com/nasa/spaceapps/discussions/1772)).

## How SIMISA responds

### Objectives and background

| Challenge requirement | SIMISA behavior | Coverage |
| --- | --- | --- |
| Visual self-assessment tool | Health overview, anatomy, charts and Crew health center | Yes |
| Pressure, pulse, glucose, temperature, sleep and mood | All six, with mood in the mental check-in, plus respiration, SpO₂, bone density and perceived stress | Yes |
| Quick assessment | Value, color and status cards; “In range / Out of range” and “Stable / Needs attention” per crew member | Yes |
| User input: keyboard, clicks, camera | Keyboard and clicks for mental check-ins; vital signs only from simulated sensors by project decision. No camera images | Partial |
| Treatment and health improvement guidance | “What to do now” per indicator: NASA HRP prevention and self-care → crew physician → ground consultation. No treatment or dosage ([Decisions](decisions.md)) | Partial; no treatment |
| Bone loss | Periodic bone density with a slight historical decline | Yes |
| Cardiovascular events | Pulse and pressure with outside-reference alerts | Yes |
| Behavioral health, isolation and confinement | Daily mental check-in; one crew member’s stress rises before the episode | Yes |
| Hostile closed environment | Prepared respiratory episode with related SpO₂, breathing and pulse changes | Yes, simulated |
| Distance from Earth | Ground reports and onboard commander/physician supervision; communication delay is not simulated | Partial |
| Radiation | Personal dosimeter and synthetic dose rate in µSv/h per crew member, under Abdomen for navigation; no cumulative dose or risk assessment | Partial |
| Immune changes and nutrition | No dedicated indicators or simulation | No |

### Guiding questions

| Question | SIMISA coverage |
| --- | --- |
| Which measurements can be made in space? | **Yes:** “How it is measured” explains device, frequency and conditions for each indicator. |
| Why is an exam needed? | **Yes:** “Why it matters in space” in Body health, Health overview, Charts and Medical information. |
| How do hazards affect indicators? | **Yes:** each indicator links NASA HRP hazards and risks; Medical information presents all five hazards. |
| When does a result need attention? | **Yes, with illustrative references:** outside reference → notify crew physician; 10 continuous minutes or two consecutive daily records → physician considers ground consultation. A demo rule, not a clinical criterion. |
| Which actions prevent a critical condition? | **Partial:** general prevention per indicator (exercise, rest, nutrition, spacewalk procedures) and device actions. No treatment. |

### Interface and optional features

| Feature | SIMISA coverage |
| --- | --- |
| Clickable human figure with function and status | **Yes:** six regions, readings, chart, “What to do now”, zoom and pan. |
| Animation and interactivity | **Yes:** reproducible mission clock advances all views; anatomy zoom and chart windows. |
| Dynamic charts | **Yes:** 1 hour to 14 days, mean with min–max band, simulation start marker. |
| Color coding | **Yes:** green, orange and red in readings, crew, devices and alerts. |
| Simple explanations | **Yes:** what to do, why and how each indicator is measured, related risks, and “Who can help?”. |
| Measurement or routine reminders | **No:** mental check-in only, without reminders. |
| Gamification | **No.** |
| Multiple environments | **No:** one fictional mission, without environment profiles. |

## Main gaps and possible improvements

1. ~~Per-indicator guidance and explanations~~ — **done** using NASA HRP (`shared/health-guide.js`). Treatment remains excluded and requires reviewed clinical protocols.
2. **Routine reminders:** pending check-in, scheduled densitometry and device charging.
3. **Light gamification:** for example, consecutive completed check-ins.
4. **Mission environment:** station/lunar-base label and communication delay.

## Other pending items

- **NASA resource for global awards:** covered by *5 Hazards of Human Spaceflight* and *Risks of Human Spaceflight*. Mention this in the presentation.
- **Data:** synthetic measurements and illustrative references; no clinical validation or diagnosis ([Decisions](decisions.md)).
- **Submission:** the original note records November 15, 2026, 23:59 local time as the general deadline and, from a public discussion, seven slides or a video up to 30 seconds in English. Confirm those details in the [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/). The interface now opens in English and supports Spanish through the ES / EN button.
