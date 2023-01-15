import sys
import numpy as np
import cv2 as cv



#  # открыть картинку
# img = cv.imread('images/ciber.png')
#  # # указываем размеры картинки в кортеже
# # img = cv.resize(img, (500, 500))
#
#  # # меняем размер пропорционально
# img = cv.resize(img, (img.shape[1] // 2, img.shape[0] // 2))
#
#  # размытие картинки в функции GaussianBlur значение устанавливаются не четные
# img = cv.GaussianBlur(img, (9, 9), 0)
#
#  # изменить цвет картинки
# img = cv.cvtColor(img, cv.COLOR_BGR2GRAY)
#
#  # делаем углы изображение (приводим к бинарному формату, а в данном случаи формат 'GRAY')
# img = cv.Canny(img, 90, 90)
#  # делаем обводку с помощью numpy
# kernel = np.ones((5, 5), np.uint8)
# img = cv.dilate(img, kernel, iterations=1)
#  # уменьшаем жирность контура
# img = cv.erode(img, kernel, iterations=1)
#
# cv.imshow('Result', img)
#  # # обрезать картинку по нужным кол. пикселей
# # cv.imshow('Result', img[0:100, 0:150])
#
#  # # вывод размера картинки в консоль
# # print(img.shape)
#
# cv.waitKey(0)

 ## открыть веб камеру и закрыть с помощью клавиши 'q'
# cap = cv.VideoCapture(0)
# cap.set(3, 500)
# cap.set(4, 300)
#
# while True:
#     success, img = cap.read()
#     cv.imshow('Result', img)
#
#     if cv.waitKey(1) & 0xFF == ord('q'):
#         break

 # # открыть видео файл и закрыть с помощью клавиши 'q'
# cap = cv.VideoCapture('video/dog.mp4')
#
# while True:
#     success, img = cap.read()
#     cv.imshow('Result', img)
#
#     if cv.waitKey(1) & 0xFF == ord('q'):
#         break