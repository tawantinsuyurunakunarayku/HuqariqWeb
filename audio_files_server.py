#!/usr/bin/env python3

import os
import sys

import nltk
import pika
import django
import numpy as np
import ipdb

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "transcriptor.settings")
django.setup()
from website.models import Annotation
from website.choices import region_choic
from django.contrib.auth import get_user_model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(BASE_DIR, "static", "audios")

def get_audio_filename(user):
    # get annotations from user
    queryset = Annotation.objects.filter(author=user)

    # exclusions
    all_afn = [x.audio_filename for x in Annotation.objects.all()]
    counted = nltk.FreqDist(all_afn)

    exclude = set([x.audio_filename for x in Annotation.objects.filter(author=user)])
    excl2 = [k for k,v in counted.items() if v>=1]
    exclude.update(excl2)
    
    sub_dir = region_choic[int(user.region) - 1][1]
    _audios = [i for i in os.listdir(os.path.join(AUDIO_DIR, sub_dir)) if '.wav' in i]
    audios_path = [os.path.join(sub_dir,x) for x in _audios]

    avlb = [x for x in audios_path if x not in exclude]

    res = ''
    try:
       idx = np.random.random_integers(0,len(avlb)-1)
       res = avlb[idx]
    except:
       res = 'no-more'
    return res

def on_request(ch, method, props, body):
    print(body)
    author = get_user_model().objects.get(email=body.decode('utf-8'))
    response = get_audio_filename(author)
    ch.basic_publish(exchange='',
                     routing_key=props.reply_to,
                     properties=pika.BasicProperties(correlation_id = \
                                                     props.correlation_id),
                     body=response.encode('utf-8'))
    ch.basic_ack(delivery_tag = method.delivery_tag)
    print("Serving audio file: " + response)
    print("Listo. Aceptando otra peticion")

def main():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
    channel = connection.channel()
    channel.queue_declare(queue='rpc_queue')

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(on_request, queue="rpc_queue")

    print("Aceptando peticiones RPC. Ctrl-C para terminar")
    channel.start_consuming()

if __name__ == "__main__":
    sys.exit(main())
