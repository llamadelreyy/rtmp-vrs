export const PREDEFINED_PROMPTS = [
  {
    name: 'Live Description',
    description: 'Natural description of what is happening in the video feed',
    content: `Describe what you see in this image in detail. Provide a natural, comprehensive description that includes:

- The setting and environment (indoor/outdoor, type of location, lighting, weather)
- All people visible (number, what they're wearing, what they're doing, their movements and interactions)
- Objects, vehicles, and equipment present (describe colors, types, positions)
- Any activities or events taking place
- The overall atmosphere and any notable details

Be descriptive and specific, as if you're explaining the scene to someone who can't see it. Focus on what is actually visible rather than making assumptions.

Respond with only a detailed text description of the scene.`,
    shortLabel: 'Live',
    tag: 'live',
  },
  {
    name: 'Fire and Emergency Detection',
    description: 'Advanced fire detection with detailed scene analysis',
    content: `Analyze this surveillance frame specifically for fire and emergency situations. Look for:

- Visible flames of any size
- Smoke (white, black, or gray)
- Emergency lighting or alarms
- People evacuating or showing panic
- Fire suppression systems activated
- Heat distortion or glow
- Burned or charred materials
- Emergency responders or fire trucks

Describe in detail:
1. The exact location and extent of any fire/smoke
2. People's reactions and evacuation behavior
3. Visibility conditions and air quality
4. Emergency equipment present or activated
5. Immediate safety concerns and risks
6. Environmental factors (wind, weather affecting fire)

Return detailed description of the scene focusing on fire safety assessment.`,
    shortLabel: 'Fire Detection',
    tag: 'fire',
  },
  {
    name: 'Security Intrusion Analysis',
    description: 'Detailed analysis for unauthorized access and security breaches',
    content: `Analyze this frame for security intrusions and unauthorized access. Focus on:

**Access Control:**
- People in restricted or secured areas
- Attempts to breach barriers, fences, doors
- Climbing, jumping, or unusual entry methods
- Access without proper credentials or escorts

**Suspicious Behavior:**
- Individuals acting nervously or furtively
- People hiding or attempting to avoid detection
- Unauthorized vehicle presence
- Groups gathering in restricted areas
- After-hours activity in secured zones

**Environmental Security:**
- Damaged or compromised security equipment
- Open doors/windows that should be closed
- Missing or altered security signage
- Tampered locks, barriers, or access controls

Provide detailed analysis including:
1. Exact location and method of intrusion attempt
2. Number of individuals involved and their behavior
3. Tools or methods being used for access
4. Level of threat and urgency
5. Recommended security response
6. Evidence of planning or coordination

Focus on immediate security threats requiring intervention.`,
    shortLabel: 'Intrusion',
    tag: 'intrusion',
  },
  {
    name: 'Medical Emergency Detection',
    description: 'Comprehensive medical emergency and health incident analysis',
    content: `Analyze this surveillance frame for medical emergencies and health incidents. Look for:

**Medical Emergencies:**
- People who have fallen or collapsed
- Individuals in apparent distress or pain
- Unconscious or unresponsive persons
- Signs of injury (bleeding, limping, unusual posture)
- Cardiac events, seizures, or breathing difficulties

**Emergency Response:**
- Medical personnel or first responders
- Ambulances or emergency vehicles
- CPR or first aid being administered
- Emergency medical equipment in use
- Crowd gathered around someone in distress

**Environmental Health Hazards:**
- Chemical spills or toxic exposure
- Structural collapses or dangerous conditions
- Large crowds causing trampling risks
- Extreme weather health impacts

Provide detailed medical assessment:
1. Nature and severity of the medical situation
2. Number of people affected
3. Current response efforts and adequacy
4. Immediate medical needs and priorities
5. Environmental factors affecting treatment
6. Accessibility for emergency responders
7. Recommended emergency medical response

Focus on life-threatening situations requiring immediate medical intervention.`,
    shortLabel: 'Medical Emergency',
    tag: 'medical',
  },
  {
    name: 'Behavioral Analysis',
    description: 'Advanced behavioral pattern analysis for unusual or suspicious activities',
    content: `Perform detailed behavioral analysis of all individuals in this surveillance frame:

**Individual Behavior:**
- Body language and posture indicating stress, aggression, or deception
- Repetitive or compulsive behaviors
- Loitering or extended presence without clear purpose
- Avoiding security cameras or personnel
- Erratic movement patterns

**Group Dynamics:**
- Formation of unusual groups or crowds
- Signs of coordination or planning
- Leadership roles and follower behavior
- Communication methods between individuals
- Collective movement toward specific targets

**Activity Patterns:**
- Normal vs abnormal behavior for the location/time
- Behaviors inconsistent with stated purpose
- Multiple visits or reconnaissance activities
- Interaction with security systems or infrastructure
- Activities suggesting preparation for other actions

**Risk Assessment:**
- Escalation potential of current behaviors
- Threat level to persons or property
- Indicators of pre-incident planning
- Environmental factors influencing behavior
- Need for intervention or monitoring

Provide comprehensive behavioral intelligence report with specific observations and risk assessment.`,
    shortLabel: 'Behavior',
    tag: 'behavior',
  },
  {
    name: 'Traffic and Vehicle Monitoring',
    description: 'Detailed traffic flow and vehicle activity analysis',
    content: `Analyze this frame for traffic and vehicle-related activities:

**Vehicle Analysis:**
- Count and type of all vehicles (cars, trucks, motorcycles, etc.)
- License plate numbers if clearly visible
- Vehicle colors, makes, models when identifiable
- Condition and notable features of vehicles
- Parking patterns and violations

**Traffic Flow:**
- Direction and speed of traffic movement
- Traffic density and congestion levels
- Compliance with traffic signals and signs
- Lane usage and turning patterns
- Pedestrian and vehicle interactions

**Incidents and Violations:**
- Traffic accidents or near-misses
- Illegal parking or unauthorized vehicle access
- Speeding or reckless driving behavior
- Blocked emergency routes or exits
- Vehicles in restricted areas

**Security Concerns:**
- Unattended or suspicious vehicles
- Vehicles circling or conducting surveillance
- Loading/unloading of unusual cargo
- Commercial vehicles in residential areas
- Emergency vehicle access and response

Provide detailed traffic and vehicle intelligence for security and traffic management purposes.`,
    shortLabel: 'Traffic',
    tag: 'traffic',
  }
];