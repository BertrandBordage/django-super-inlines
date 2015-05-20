Django-super-inlines
====================

For now, it only adds nested inlines (see `Django#9025 <https://code.djangoproject.com/ticket/9025>`_).
But I also plan to add other features I developed for my own projects.

**There is no unit tests for the moment, so use at your own risks.**

**It would be extremely useful if someone took time to write Selenium tests.**


Usage
-----

It’s only compatible with Django 1.7.2 to 1.7.8 (I tested) and probably 1.8.
Don’t even try with previous versions, django-super-inlines relies on changes
that happened between 1.6 and 1.7.2.

For design reasons, you can’t nest inlines inside tabular inlines,
only inside stacked inlines.

1. `pip install django-super-inlines`
2. Add ``'super_inlines',`` to ``INSTALED_APPS``
   **before** ``'django.contrib.admin',``
3. If you use django-grappelli, add ``'super_inlines.grappelli_integration',``
   to ``INSTALLED_APPS`` **before** ``'grappelli',``
4. Inherit from ``SuperModelAdmin`` instead of ``ModelAdmin``,
   ``SuperInlineModelAdmin`` instead of ``InlineModelAdmin``, and use the class
   attribute ``inlines`` in inlines as you do in model admins

Example usage:

.. code-block:: python

    from django.contrib.admin import TabularInline, StackedInline, site
    from super_inlines.admin import SuperInlineModelAdmin, SuperModelAdmin

    from .models import *


    class RoomInlineAdmin(SuperInlineModelAdmin, TabularInline):
        model = Room


    class HouseInlineAdmin(SuperInlineModelAdmin, StackedInline):
        model = House
        inlines = (RoomInlineAdmin,)


    class OwnerAdmin(SuperModelAdmin):
        inlines = (HouseInlineAdmin,)


    site.register(Owner, OwnerAdmin)
