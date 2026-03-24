export interface Animal {
  id: string;
  name: string;
  englishName: string;
  image: string;
  sound?: string;
  description: string;
}

const createAnimalPlaceholder = (name: string, englishName: string) =>
  `https://placehold.co/800x600/e8f5e9/166534?text=${encodeURIComponent(`${name} ${englishName}`)}`;

export const ANIMALS: Animal[] = [
  {
    id: 'lion',
    name: '狮子',
    englishName: 'Lion',
    image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&q=80',
    sound: '/sounds/lion.mp3',
    description: '森林之王，吼声很大。'
  },
  {
    id: 'tiger',
    name: '老虎',
    englishName: 'Tiger',
    image: 'https://images.unsplash.com/photo-1501705388883-4ed8a543392c?w=800&q=80',
    sound: '/sounds/tiger.mp3',
    description: '威风凛凛的山中大王。'
  },
  {
    id: 'deer',
    name: '鹿',
    englishName: 'Deer',
    image: 'https://images.unsplash.com/photo-1543946207-39bd91e70ca7?w=800&q=80',
    sound: '/sounds/deer.mp3',
    description: '温顺的梅花鹿，跑得很快。'
  },
  {
    id: 'elephant',
    name: '大象',
    englishName: 'Elephant',
    image: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&q=80',
    sound: '/sounds/elephant.mp3',
    description: '有着长长的鼻子和大大的耳朵。'
  },
  {
    id: 'cat',
    name: '小猫',
    englishName: 'Cat',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
    description: '爱吃鱼，喜欢喵喵叫。'
  },
  {
    id: 'dog',
    name: '小狗',
    englishName: 'Dog',
    image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80',
    sound: '/sounds/dog.mp3',
    description: '人类的好朋友，喜欢汪汪叫。'
  },
  {
    id: 'duck',
    name: '鸭子',
    englishName: 'Duck',
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&q=80',
    sound: '/sounds/duck.mp3',
    description: '喜欢在水里游泳，嘎嘎叫。'
  },
  {
    id: 'pig',
    name: '猪',
    englishName: 'Pig',
    image: createAnimalPlaceholder('猪', 'Pig'),
    description: '喜欢在泥巴里打滚，哼哼叫。'
  },
  {
    id: 'rabbit',
    name: '兔子',
    englishName: 'Rabbit',
    image: createAnimalPlaceholder('兔子', 'Rabbit'),
    description: '长着长耳朵，蹦蹦跳跳很可爱。'
  },
  {
    id: 'monkey',
    name: '猴子',
    englishName: 'Monkey',
    image: createAnimalPlaceholder('猴子', 'Monkey'),
    description: '喜欢爬树，动作灵活又调皮。'
  },
  {
    id: 'panda',
    name: '熊猫',
    englishName: 'Panda',
    image: createAnimalPlaceholder('熊猫', 'Panda'),
    description: '黑白相间，最爱抱着竹子慢慢吃。'
  },
  {
    id: 'sheep',
    name: '绵羊',
    englishName: 'Sheep',
    image: createAnimalPlaceholder('绵羊', 'Sheep'),
    description: '毛茸茸的，喜欢在草地上安静吃草。'
  },
  {
    id: 'cow',
    name: '奶牛',
    englishName: 'Cow',
    image: createAnimalPlaceholder('奶牛', 'Cow'),
    description: '黑白花纹很显眼，喜欢慢悠悠地嚼草。'
  },
  {
    id: 'horse',
    name: '小马',
    englishName: 'Horse',
    image: createAnimalPlaceholder('小马', 'Horse'),
    description: '跑得又快又稳，鬃毛飘起来很好看。'
  },
  {
    id: 'rooster',
    name: '公鸡',
    englishName: 'Rooster',
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80',
    sound: '/sounds/rooster.mp3',
    description: '早上喔喔叫，叫宝宝起床。'
  }
];
