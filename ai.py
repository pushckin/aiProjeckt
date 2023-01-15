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



# # закрашивание, линие , круги , тексты
# img = np.zeros((512,512,3), np.uint8)
#
#
# cv.line(img,(0, img.shape[0] // 2),(img.shape[1], img.shape[0] // 2),(255,0,0),2)
#
# cv.circle(img, (img.shape[1] // 2, img.shape[0] // 2), 30,(255,0,0), 2)
#
# cv.putText(img,'OpenCV',(10,500), cv.FONT_HERSHEY_TRIPLEX, 1, (255,0,0), 2, cv.LINE_AA)
#
# cv.imshow('imag', img)
# cv.waitKey(0)


# img = cv.imread('images/ciber.png')
# img = cv.resize(img, (500, 500))

# # img = cv.flip(img, 1)
# # функция поворота и увел/уменьше.
# def rotate(img_param, angle):
#     height, width = img.shape[:2]
#     point = (width // 2, height // 2)
#
#     mat = cv.getRotationMatrix2D(point, angle, 2)
#     return cv.warpAffine(img, mat, (width, height))
#
# # img = rotate(img, 360)
# # функция отступов по x, y
# def transform(img_param, x, y):
#     mat = np.float32([[1, 0, x], [0, 1, y]])
#     return cv.warpAffine(img_param, mat, (img_param.shape[1], img_param.shape[0]))
#
# img = transform(img, 20, 20)

# # находим новые контуры картинки
# new_img = np.zeros(img.shape, 'uint8')
#
# img = cv.cvtColor(img, cv.COLOR_BGR2GRAY)
# img = cv.GaussianBlur(img, (5, 5), 0)
#
# img = cv.Canny(img, 20, 50)
#
# con, hir = cv.findContours(img, cv.RETR_LIST, cv.CHAIN_APPROX_NONE)
#
# cv.drawContours(new_img, con, -1, (230, 111, 140), 1)
#
# cv.imshow('photo', new_img)
# cv.waitKey(0)
# # меняем цветовую гамму
# img = cv.imread('images/ciber.png')
# img = cv.resize(img, (500, 500))
#
# img = cv.cvtColor(img, cv.COLOR_BGR2LAB)
#
# img = cv.cvtColor(img, cv.COLOR_LAB2BGR)
#
# img = cv.cvtColor(img, cv.COLOR_BGR2RGB)
#
# r, g, b = cv.split(img)
#
# img = cv.merge([g, r, b])
#
# cv.imshow('res', img)
# cv.waitKey(0)
# # наложение дрог на друга и создание масок
# photo = cv.imread('images/ciber.png')
# img = np.zeros(photo.shape[:2], 'uint8')
#
# circle = cv.circle(img.copy(), (500, 270), 250, 255, -1)
# square = cv.rectangle(img.copy(), (25, 25), (250, 350), 255, -1)
#
# img = cv.bitwise_and(photo, photo, mask=circle)
# # img = cv.bitwise_or(circle, square)
# # img = cv.bitwise_xor(circle, square)
# # img = cv.bitwise_not(square)
#
# cv.imshow('res', img)
# cv.waitKey(0)

