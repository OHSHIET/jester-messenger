# Generated by Django 4.1.5 on 2023-03-12 19:30

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('messenger', '0009_alter_chat_link'),
    ]

    operations = [
        migrations.AlterField(
            model_name='chat',
            name='link',
            field=models.TextField(default=None, max_length=128, null=True, unique=True),
        ),
    ]