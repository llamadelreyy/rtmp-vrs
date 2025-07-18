export const PREDEFINED_PROMPTS = [
  {
    name: 'Incident Analysis',
    description: 'Analyzes video content for multiple potential threats and incidents',
    content: `With given this json
{
"description": ,
"fire": ,
"gun": ,
"theft": ,
"medical": ,
}
1) Fill in json key description with detailed description of what's in the picture.
2) For any fire, gun, theft, medical items if appeared in the picture, fill json key with true if found in the image, else false.
Output as clean json only.`,
    shortLabel: 'Analysis',
    tag: 'analysis',
  },
  {
    name: 'Fire Detection',
    description: 'Detects fire in the video stream',
    content: 'Detect fire incidents in the video stream.',
    shortLabel: 'Fire',
    tag: 'fire',

  },
  {
    name: 'Intrusion Detection',
    description: 'Detects unauthorized access to a restricted area',
    content: 'Detect unauthorized access to a restricted area.',
    shortLabel: 'Intrusion',
    tag: 'intrusion',
  },
  {
    name: 'Medical Emergency Detection',
    description: 'Detects medical emergencies in the video stream',
    content: 'Detect medical emergencies in the video stream.',
    shortLabel: 'Medical Emergency',
    tag: 'medical',
  },
];