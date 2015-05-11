#!/usr/bin/env python

import os
from setuptools import setup, find_packages
from super_inlines import version_string


CURRENT_PATH = os.path.abspath(os.path.dirname(__file__))

with open(os.path.join(CURRENT_PATH, 'requirements.txt')) as f:
    required = f.read().splitlines()


setup(
    name='django-super-inlines',
    version=version_string,
    author='Bertrand Bordage',
    author_email='bordage.bertrand@gmail.com',
    url='https://github.com/BertrandBordage/django-super-inlines',
    description='Adds useful features to inlines, '
                'such as the ability to nest them.',
    long_description=open('README.rst').read(),
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.2',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Topic :: Internet :: WWW/HTTP',
    ],
    license='BSD',
    packages=find_packages(),
    install_requires=required,
    include_package_data=True,
    zip_safe=False,
)
