import { Question } from '@fumik/shared/types';

export const TRIVIA_QUESTIONS: Question[] = [
  // Naija/African Culture
  {
    id: 'n1',
    category: 'Naija/African Culture',
    question: 'What is the national dish of Nigeria?',
    options: ['Jollof Rice', 'Eba and Egusi', 'Amala', 'Pounded Yam'],
    correctIndex: 0,
    difficulty: 'easy'
  },
  {
    id: 'n2',
    category: 'Naija/African Culture',
    question: 'Which Nigerian city is known as the "Center of Excellence"?',
    options: ['Abuja', 'Kano', 'Lagos', 'Ibadan'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  {
    id: 'n3',
    category: 'Naija/African Culture',
    question: 'Who was the first Nigerian to win a Nobel Prize?',
    options: ['Chinua Achebe', 'Wole Soyinka', 'Nnamdi Azikiwe', 'Fela Kuti'],
    correctIndex: 1,
    difficulty: 'medium'
  },
  {
    id: 'n4',
    category: 'Naija/African Culture',
    question: 'In which year did Nigeria gain independence?',
    options: ['1957', '1960', '1963', '1970'],
    correctIndex: 1,
    difficulty: 'easy'
  },
  {
    id: 'n5',
    category: 'Naija/African Culture',
    question: 'What is the largest country in Africa by land area?',
    options: ['Nigeria', 'Egypt', 'Algeria', 'South Africa'],
    correctIndex: 2,
    difficulty: 'medium'
  },
  // Pop Culture
  {
    id: 'p1',
    category: 'Pop Culture',
    question: 'Who is the "King of Pop"?',
    options: ['Elvis Presley', 'Prince', 'Michael Jackson', 'Justin Bieber'],
    correctIndex: 2,
    difficulty: 'easy'
  },
  // Science
  {
    id: 's1',
    category: 'Science',
    question: 'What is the chemical symbol for Gold?',
    options: ['Gd', 'Go', 'Ag', 'Au'],
    correctIndex: 3,
    difficulty: 'easy'
  }
];
