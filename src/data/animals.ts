export interface Animal {
  id: string;
  name: string;
  englishName: string;
  image: string;
  sound: string;
  description: string;
}

export const ANIMALS: Animal[] = [
  {
    id: 'lion',
    name: '狮子',
    englishName: 'Lion',
    image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&q=80',
    sound: '/api/animal/static/lion',
    description: '森林之王，吼声很大。'
  },
  {
    id: 'elephant',
    name: '大象',
    englishName: 'Elephant',
    image: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&q=80',
    sound: '/api/animal/static/elephant',
    description: '有着长长的鼻子和大大的耳朵。'
  },
  {
    id: 'cat',
    name: '小猫',
    englishName: 'Cat',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
    sound: '/api/animal/static/cat',
    description: '爱吃鱼，喜欢喵喵叫。'
  },
  {
    id: 'dog',
    name: '小狗',
    englishName: 'Dog',
    image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80',
    sound: '/api/animal/static/dog',
    description: '人类的好朋友，喜欢汪汪叫。'
  },
  {
    id: 'duck',
    name: '鸭子',
    englishName: 'Duck',
    image: 'https://images.unsplash.com/photo-1530121848912-820abeed7632?w=800&q=80',
    sound: '/api/animal/static/duck',
    description: '喜欢在水里游泳，嘎嘎叫。'
  },
  {
    id: 'rooster',
    name: '公鸡',
    englishName: 'Rooster',
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80',
    sound: '/api/animal/static/rooster',
    description: '早上喔喔叫，叫宝宝起床。'
  }
];
